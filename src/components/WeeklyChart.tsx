
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";

interface StepData {
  userId: string;
  userName: string;
  steps: number;
  week: number;
  timestamp: number;
}

const WeeklyChart = () => {
  const [data, setData] = useState<StepData[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, "steps"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        const stepData: StepData[] = [];
        querySnapshot.forEach((doc) => {
          stepData.push(doc.data() as StepData);
        });

        setData(stepData.sort((a, b) => a.week - b.week));
      } catch (error) {
        console.error("Error fetching step data:", error);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="w-full h-[300px]">
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
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="week"
            label={{ value: "Week", position: "insideBottom", offset: -5 }}
          />
          <YAxis label={{ value: "Steps", angle: -90, position: "insideLeft" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Line
            type="monotone"
            dataKey="steps"
            stroke="#000"
            strokeWidth={2}
            dot={{ strokeWidth: 2 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyChart;
