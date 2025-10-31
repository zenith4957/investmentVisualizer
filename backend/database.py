#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sqlite3
import yfinance as yf
import pandas as pd
import requests
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "stock_data.db")

def get_sp500_tickers():
    """Wikipedia에서 S&P 500 티커 목록을 가져옵니다."""
    try:
        url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        table = pd.read_html(resp.text)[0]
        tickers = table['Symbol'].str.replace('.', '-').tolist()
        print(f"[INFO] S&P 500 티커 {len(tickers)}개 수집 완료.")
        return tickers
    except Exception as e:
        print(f"[ERROR] S&P 500 티커 수집 실패: {e}")
        return []

def init_db():
    """데이터베이스와 테이블을 초기화합니다."""
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        print(f"[INFO] 디렉토리 생성: {db_dir}")

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"[INFO] 기존 DB 삭제: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 주식 기본 정보 테이블
    c.execute('''
        CREATE TABLE stocks (
            ticker TEXT PRIMARY KEY,
            company_name TEXT,
            exchange TEXT
        )
    ''')

    # 월별 가격 정보 테이블
    c.execute('''
        CREATE TABLE monthly_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT,
            date TEXT,
            price REAL,
            FOREIGN KEY (ticker) REFERENCES stocks (ticker)
        )
    ''')

    conn.commit()
    conn.close()
    print("[INFO] DB 및 테이블 생성 완료")

def fetch_and_store_ticker_data(ticker_str):
    """단일 티커에 대한 데이터를 가져와 DB에 저장합니다."""
    try:
        stock = yf.Ticker(ticker_str)
        
        info = stock.info
        company_name = info.get('longName', 'N/A')
        exchange = info.get('exchange', 'N/A')

        hist = stock.history(start="1990-01-01", interval="1mo", auto_adjust=True)

        if hist.empty:
            return (ticker_str, "No data")

        monthly_prices = []
        for index, row in hist.iterrows():
            date_str = index.strftime('%Y-%m-01')
            price = row['Close']
            monthly_prices.append((ticker_str, date_str, price))
        
        return (ticker_str, company_name, exchange, monthly_prices)
    except Exception as e:
        return (ticker_str, str(e))

def populate_all_sp500_data(max_workers=10):
    """S&P 500 모든 주식의 월별 데이터를 병렬로 수집하여 DB에 저장합니다."""
    tickers = get_sp500_tickers()
    if not tickers:
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    completed = 0
    total = len(tickers)
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_ticker = {executor.submit(fetch_and_store_ticker_data, ticker): ticker for ticker in tickers}
        
        for future in as_completed(future_to_ticker):
            completed += 1
            try:
                result = future.result()
                ticker, company_name, exchange, monthly_prices = result
                
                c.execute("INSERT OR REPLACE INTO stocks (ticker, company_name, exchange) VALUES (?, ?, ?)",
                          (ticker, company_name, exchange))
                
                c.executemany("INSERT INTO monthly_prices (ticker, date, price) VALUES (?, ?, ?)",
                              monthly_prices)
                
                conn.commit()

                if completed % 50 == 0:
                    print(f"[INFO] 진행률: {completed}/{total} ({ticker} 완료)")

            except Exception as e:
                ticker_str = future_to_ticker[future]
                print(f"[ERROR] {ticker_str} 결과 처리 중 오류 발생: {e}")

    elapsed = time.time() - start_time
    print(f"\n[SUCCESS] 모든 데이터 처리가 완료되었습니다. (소요 시간: {elapsed:.2f}초)")
    conn.close()


if __name__ == "__main__":
    init_db()
    populate_all_sp500_data(max_workers=20)
