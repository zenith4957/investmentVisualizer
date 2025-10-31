from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)  # 모든 출처에서의 요청을 허용합니다.

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "stock_data.db")

def get_db_connection():
    """데이터베이스 연결을 생성합니다."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/tickers', methods=['GET'])
def get_tickers():
    """DB에 저장된 모든 주식 티커를 반환합니다."""
    try:
        conn = get_db_connection()
        tickers = conn.execute('SELECT ticker FROM stocks').fetchall()
        conn.close()
        return jsonify([ticker['ticker'] for ticker in tickers])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/simulation', methods=['POST'])
def run_simulation():
    """투자 시뮬레이션을 실행하고 결과를 반환합니다."""
    try:
        data = request.json
        tickers = data.get('tickers')
        start_date_str = data.get('startDate')
        end_date_str = data.get('endDate')
        monthly_investment = float(data.get('monthlyInvestment', 100))

        if not all([tickers, start_date_str, end_date_str]):
            return jsonify({"error": "Missing required parameters"}), 400

        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        
        conn = get_db_connection()
        
        # 각 티커별 월별 가격 데이터 조회
        price_data = {}
        for ticker in tickers:
            rows = conn.execute(
                'SELECT date, price FROM monthly_prices WHERE ticker = ? AND date BETWEEN ? AND ? ORDER BY date',
                (ticker, start_date.strftime('%Y-%m-01'), end_date.strftime('%Y-%m-01'))
            ).fetchall()
            price_data[ticker] = {row['date']: row['price'] for row in rows}

        conn.close()

        # 시뮬레이션 실행
        simulation_results = {}
        for ticker in tickers:
            simulation_results[ticker] = []

        total_shares = {ticker: 0 for ticker in tickers}
        current_date = start_date
        
        investment_per_ticker = monthly_investment

        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-01')
            
            # 매월 1일, 각 주식에 투자
            for ticker in tickers:
                if date_str in price_data[ticker] and price_data[ticker][date_str] > 0:
                    shares_to_buy = investment_per_ticker / price_data[ticker][date_str]
                    total_shares[ticker] += shares_to_buy
            
            # 현재 날짜의 자산 가치를 각 티커별로 계산
            for ticker in tickers:
                asset_value = 0
                if date_str in price_data[ticker]:
                    asset_value = total_shares[ticker] * price_data[ticker][date_str]
                
                # 해당 티커의 결과 리스트에 날짜와 자산 가치 추가
                # 날짜가 없는 경우를 대비해 이전 데이터를 복사하는 대신, 있는 날짜만 추가
                simulation_results[ticker].append({
                    "date": date_str,
                    "assetValue": round(asset_value, 2)
                })

            # 다음 달로 이동
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)

        # 데이터 포맷을 recharts에 맞게 변환
        # { date: 'YYYY-MM-01', ticker1: value1, ticker2: value2 }
        recharts_data = []
        # 모든 날짜를 수집
        all_dates = set()
        for ticker in tickers:
            for item in simulation_results[ticker]:
                all_dates.add(item['date'])
        
        sorted_dates = sorted(list(all_dates))

        for date in sorted_dates:
            data_point = {"date": date}
            for ticker in tickers:
                # 해당 날짜의 데이터를 찾아서 추가
                asset_value = 0 # 기본값
                for item in simulation_results[ticker]:
                    if item['date'] == date:
                        asset_value = item['assetValue']
                        break
                data_point[ticker] = asset_value
            recharts_data.append(data_point)


        return jsonify(recharts_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)