#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sqlite3
import yfinance as yf
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "stock_data.db")

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

def fetch_and_store_monthly_data(tickers):
    """
    주어진 티커에 대해 1990년부터 월별 데이터를 가져와 DB에 저장합니다.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    for ticker_str in tickers:
        try:
            print(f"[INFO] {ticker_str} 데이터 수집 시작...")
            stock = yf.Ticker(ticker_str)
            
            # 주식 기본 정보 저장
            info = stock.info
            company_name = info.get('longName', 'N/A')
            exchange = info.get('exchange', 'N/A')
            c.execute("INSERT OR REPLACE INTO stocks (ticker, company_name, exchange) VALUES (?, ?, ?)",
                      (ticker_str, company_name, exchange))

            # 1990년부터 현재까지의 월별 데이터 가져오기
            hist = stock.history(start="1990-01-01", interval="1mo", auto_adjust=True)

            if hist.empty:
                print(f"[WARN] {ticker_str}에 대한 데이터가 없습니다.")
                continue

            # 월별 데이터 DB에 저장
            for index, row in hist.iterrows():
                date_str = index.strftime('%Y-%m-01')
                price = row['Close']
                c.execute("INSERT INTO monthly_prices (ticker, date, price) VALUES (?, ?, ?)",
                          (ticker_str, date_str, price))
            
            print(f"[INFO] {ticker_str} 데이터 저장 완료. 총 {len(hist)}개월")

        except Exception as e:
            print(f"[ERROR] {ticker_str} 처리 중 오류 발생: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    # 시뮬레이션할 주식 티커
    # 예: SPY (S&P 500 ETF), QQQ (Nasdaq 100 ETF)
    target_tickers = ["SPY", "QQQ"]
    
    init_db()
    fetch_and_store_monthly_data(target_tickers)
    print("\n[SUCCESS] 모든 데이터 처리가 완료되었습니다.")
