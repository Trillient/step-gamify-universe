
import { Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ProgressChartProps {
  chartData: any[];
  uniqueUsers: string[];
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'];

const ProgressChart = ({ chartData, uniqueUsers }: ProgressChartProps) => {
  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4" /> Combined Progress Chart
      </h3>
      <div className="w-full h-[400px] bg-white/30 backdrop-blur-sm rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend />
            {uniqueUsers.map((userName, index) => (
              <Line
                key={userName}
                type="monotone"
                dataKey={userName}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ strokeWidth: 2, fill: COLORS[index % COLORS.length] }}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressChart;
