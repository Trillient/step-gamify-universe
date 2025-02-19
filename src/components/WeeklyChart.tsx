
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface StepData {
  userId: string;
  userName: string;
  steps: number;
  week: number;
  year: number;
  startDate: string;
  endDate: string;
  timestamp: number;
}

const WeeklyChart = () => {
  const [data, setData] = useState<StepData[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const currentYear = new Date().getFullYear();
    const q = query(
      collection(db, "steps"),
      where("userId", "==", user.uid),
      where("year", "==", currentYear)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stepData: StepData[] = [];
      snapshot.forEach((doc) => {
        stepData.push(doc.data() as StepData);
      });
      setData(stepData.sort((a, b) => a.week - b.week));
    }, (error) => {
      console.error("Error fetching step data:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const formatXAxis = (weekNum: number) => `Week ${weekNum}`;

  return (
    <div className="w-full h-[300px] bg-white/30 backdrop-blur-sm rounded-lg p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="week"
            tickFormatter={formatXAxis}
            label={{ value: "Weeks", position: "insideBottom", offset: -5 }}
          />
          <YAxis label={{ value: "Steps", angle: -90, position: "insideLeft" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: number) => [`${value.toLocaleString()} steps`]}
            labelFormatter={(week) => {
              const weekData = data.find(d => d.week === week);
              if (weekData) {
                return `Week ${week}\n${format(new Date(weekData.startDate), 'MMM d')} - ${format(new Date(weekData.endDate), 'MMM d')}`;
              }
              return `Week ${week}`;
            }}
          />
          <Line
            type="monotone"
            dataKey="steps"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ strokeWidth: 2, fill: "#8b5cf6" }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyChart;
