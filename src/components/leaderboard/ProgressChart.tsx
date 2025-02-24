
import { Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { StepData } from "./types";
import { useTheme } from "next-themes";

interface ProgressChartProps {
  weeklyData: StepData[];
  weekRanges: number[];
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'];

const ProgressChart = ({ weeklyData, weekRanges }: ProgressChartProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Get unique users
  const uniqueUsers = [...new Set(weeklyData.map(d => d.userName))];

  // Prepare data for combined chart
  const chartData = weekRanges.map(week => {
    const weekData: { [key: string]: any } = { week: `Week ${week}` };
    const usersInWeek = weeklyData.filter(d => d.week === week);
    
    // Initialize all users with 0 steps for this week
    uniqueUsers.forEach(userName => {
      weekData[userName] = 0;
    });
    
    // Update steps for users who have data this week
    usersInWeek.forEach(userData => {
      weekData[userData.userName] = userData.steps;
    });
    
    return weekData;
  });

  if (chartData.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Combined Progress Chart
        </h3>
        <div className="w-full h-[400px] bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4" /> Combined Progress Chart
      </h3>
      <div className="w-full h-[400px] bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-lg p-4">
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
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} 
            />
            <XAxis 
              dataKey="week" 
              stroke={isDark ? "#9ca3af" : "#4b5563"}
            />
            <YAxis 
              stroke={isDark ? "#9ca3af" : "#4b5563"}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                color: isDark ? "#fff" : "#000",
              }}
            />
            <Legend 
              wrapperStyle={{
                color: isDark ? "#fff" : "#000",
              }}
            />
            {uniqueUsers.map((userName, index) => (
              <Line
                key={userName}
                type="monotone"
                dataKey={userName}
                name={userName}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ 
                  strokeWidth: 2, 
                  fill: isDark ? "#111827" : "#ffffff",
                  stroke: COLORS[index % COLORS.length],
                }}
                activeDot={{ 
                  r: 8, 
                  stroke: COLORS[index % COLORS.length],
                  fill: isDark ? "#111827" : "#ffffff",
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressChart;
