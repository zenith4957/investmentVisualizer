"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  date: string;
  [key: string]: number | string; // Allow any ticker as a key
}

interface InvestmentChartProps {
  data: ChartData[];
  tickers: string[];
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#0088FE",
  "#00C49F",
];

const InvestmentChart = ({ data, tickers }: InvestmentChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              notation: "compact",
            }).format(value)
          }
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(value),
            name,
          ]}
        />
        <Legend />
        {tickers.map((ticker, index) => (
          <Line
            key={ticker}
            type="monotone"
            dataKey={ticker}
            stroke={COLORS[index % COLORS.length]}
            activeDot={{ r: 8 }}
            dot={false}
            isAnimationActive={false}
            name={ticker}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default InvestmentChart;
