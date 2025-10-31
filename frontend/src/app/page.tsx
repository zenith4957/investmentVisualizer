"use client";

import { useState, useEffect } from "react";
import InvestmentChart from "@/components/InvestmentChart";

interface SimulationData {
  date: string;
  [key: string]: number | string;
}

export default function Home() {
  const [allTickers, setAllTickers] = useState<string[]>([]);
  const [filteredTickers, setFilteredTickers] = useState<string[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    "SPY",
    "QQQ",
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("1990-01-01");
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [monthlyInvestment, setMonthlyInvestment] = useState("100");
  const [simulationData, setSimulationData] = useState<SimulationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/tickers");
        if (!response.ok) {
          throw new Error("Failed to fetch tickers");
        }
        const data = await response.json();
        setAllTickers(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      }
    };
    fetchTickers();
  }, []);

  useEffect(() => {
    const filtered = allTickers.filter(
      (ticker) =>
        ticker.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedTickers.includes(ticker)
    );
    setFilteredTickers(filtered);
  }, [searchTerm, allTickers, selectedTickers]);

  const handleAddTicker = (ticker: string) => {
    if (!selectedTickers.includes(ticker)) {
      setSelectedTickers([...selectedTickers, ticker]);
    }
  };

  const handleRemoveTicker = (ticker: string) => {
    setSelectedTickers(selectedTickers.filter((t: string) => t !== ticker));
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

      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < data.length) {
          setSimulationData((prevData) => [...prevData, data[currentIndex]]);
          currentIndex++;
        } else {
          clearInterval(interval);
          setLoading(false);
        }
      }, 10);
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 p-4 bg-gray-800 rounded-lg">
          {/* Ticker Selection */}
          <div className="flex flex-col col-span-1 md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="search" className="mb-2 text-sm font-medium">
                  Available Tickers
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 rounded bg-gray-700 border border-gray-600 mb-2 w-full"
                />
                <div className="bg-gray-900 p-2 rounded border border-gray-600 h-48 overflow-y-auto">
                  {filteredTickers.map((ticker) => (
                    <div
                      key={ticker}
                      onDoubleClick={() => handleAddTicker(ticker)}
                      className="p-1 cursor-pointer hover:bg-gray-700 rounded"
                    >
                      {ticker}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 text-sm font-medium">
                  Selected Tickers
                </label>
                <div className="bg-gray-900 p-2 rounded border border-gray-600 h-48 overflow-y-auto mt-[44px]">
                  {selectedTickers.map((ticker) => (
                    <div
                      key={ticker}
                      onDoubleClick={() => handleRemoveTicker(ticker)}
                      className="p-1 cursor-pointer hover:bg-gray-700 rounded"
                    >
                      {ticker}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col col-span-1 justify-between">
            <div>
              <div className="flex flex-col mb-4">
                <label htmlFor="startDate" className="mb-2 text-sm font-medium">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
              <div className="flex flex-col mb-4">
                <label htmlFor="endDate" className="mb-2 text-sm font-medium">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-2 rounded bg-gray-700 border border-gray-600"
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
                  className="p-2 rounded bg-gray-700 border border-gray-600"
                />
              </div>
            </div>
            <div className="flex items-end h-full mt-4">
              <button
                onClick={runSimulation}
                disabled={loading || selectedTickers.length === 0}
                className="w-full p-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
              >
                {loading ? "Simulating..." : "Run Simulation"}
              </button>
            </div>
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
