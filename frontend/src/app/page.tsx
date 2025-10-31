"use client";

import { useState, useEffect } from "react";
import InvestmentChart from "@/components/InvestmentChart";

interface SimulationData {
  date: string;
  [key: string]: number | string;
}

export default function Home() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    "SPY",
    "QQQ",
  ]);
  const [startDate, setStartDate] = useState("1990-01-01");
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [monthlyInvestment, setMonthlyInvestment] = useState("100");
  const [simulationData, setSimulationData] = useState<SimulationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 백엔드에서 사용 가능한 티커 목록을 가져옵니다.
    const fetchTickers = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/tickers");
        if (!response.ok) {
          throw new Error("Failed to fetch tickers");
        }
        const data = await response.json();
        setTickers(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      }
    };
    fetchTickers();
  }, []);

  const handleTickerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { options } = event.target;
    const value: string[] = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    setSelectedTickers(value);
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    setSimulationData([]);

    try {
      const response = await fetch("http://localhost:5001/api/simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tickers: selectedTickers,
          startDate,
          endDate,
          monthlyInvestment: parseFloat(monthlyInvestment),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Simulation failed");
      }

      const data = await response.json();

      // 애니메이션 효과를 위해 데이터를 점진적으로 표시
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < data.length) {
          setSimulationData((prevData) => [...prevData, data[currentIndex]]);
          currentIndex++;
        } else {
          clearInterval(interval);
          setLoading(false);
        }
      }, 10); // 10ms 간격으로 데이터 포인트 추가
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <div className="w-full max-w-6xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          Investment Growth Simulation
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <div className="flex flex-col">
            <label htmlFor="tickers" className="mb-2 text-sm font-medium">
              Tickers (multi-select)
            </label>
            <select
              id="tickers"
              multiple
              value={selectedTickers}
              onChange={handleTickerChange}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            >
              {tickers.map((ticker) => (
                <option key={ticker} value={ticker}>
                  {ticker}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="startDate" className="mb-2 text-sm font-medium">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="mb-2 text-sm font-medium">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="monthlyInvestment"
              className="mb-2 text-sm font-medium"
            >
              Monthly Investment ($)
            </label>
            <input
              type="number"
              id="monthlyInvestment"
              value={monthlyInvestment}
              onChange={(e) => setMonthlyInvestment(e.target.value)}
              className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={runSimulation}
              disabled={loading || selectedTickers.length === 0}
              className="w-full p-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
            >
              {loading ? "Simulating..." : "Run Simulation"}
            </button>
          </div>
        </div>

        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          {simulationData.length > 0 ? (
            <div>
              <InvestmentChart
                data={simulationData}
                tickers={selectedTickers}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 text-lg">
                {selectedTickers.map((ticker) => {
                  const finalAssetValue =
                    (simulationData[simulationData.length - 1][
                      ticker
                    ] as number) || 0;
                  const firstInvestment = simulationData.find(
                    (d) => (d[ticker] as number) > 0
                  );
                  const investmentStartDate = firstInvestment
                    ? firstInvestment.date
                    : "N/A";
                  const investmentMonths = simulationData.filter(
                    (d) => (d[ticker] as number) > 0
                  ).length;
                  const totalInvestment =
                    parseFloat(monthlyInvestment) * investmentMonths;
                  const returnRate =
                    totalInvestment > 0
                      ? ((finalAssetValue - totalInvestment) /
                          totalInvestment) *
                        100
                      : 0;

                  return (
                    <div key={ticker} className="bg-gray-700 p-4 rounded">
                      <h3 className="text-xl font-bold text-center mb-2">
                        {ticker}
                      </h3>
                      <div className="flex justify-between">
                        <span>Start Date:</span>
                        <span>{investmentStartDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Final Value:</span>
                        <span className="font-semibold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(finalAssetValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Invested:</span>
                        <span>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(totalInvestment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Return Rate:</span>
                        <span
                          className={
                            returnRate >= 0 ? "text-green-400" : "text-red-400"
                          }
                        >
                          {returnRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              {loading
                ? "Generating chart..."
                : 'Click "Run Simulation" to see the investment growth.'}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
