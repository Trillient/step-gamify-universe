
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Trophy, Crown, Medal, ChevronUp, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface StepData {
  userId: string;
  userName: string;
  steps: number;
  week: number;
  year: number;
  startDate: string;
  endDate: string;
}

interface UserTotalSteps {
  userId: string;
  userName: string;
  totalSteps: number;
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'];

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<StepData[]>([]);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<UserTotalSteps[]>([]);
  const [weeklyData, setWeeklyData] = useState<StepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [weekRanges, setWeekRanges] = useState<number[]>([]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 9, 1); // October 1st
    const now = Date.now();
    const weekNumber = Math.ceil((now - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setCurrentWeek(Math.max(1, weekNumber));

    // Calculate available weeks
    const weeks: number[] = [];
    for (let i = 1; i <= weekNumber; i++) {
      weeks.push(i);
    }
    setWeekRanges(weeks);
  }, []);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    // Query for selected week
    const weekQuery = query(
      collection(db, "steps"),
      where("year", "==", currentYear),
      where("week", "==", currentWeek)
    );

    // Query for all weeks to calculate totals and chart data
    const allWeeksQuery = query(
      collection(db, "steps"),
      where("year", "==", currentYear)
    );

    const weekUnsubscribe = onSnapshot(weekQuery, (snapshot) => {
      const data: StepData[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data() as StepData);
      });
      setLeaderboard(data.sort((a, b) => b.steps - a.steps));
      setLoading(false);
    });

    const allWeeksUnsubscribe = onSnapshot(allWeeksQuery, (snapshot) => {
      const data: StepData[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data() as StepData);
      });
      setWeeklyData(data);

      // Calculate all-time leaderboard
      const totals = data.reduce((acc: { [key: string]: UserTotalSteps }, curr) => {
        if (!acc[curr.userId]) {
          acc[curr.userId] = {
            userId: curr.userId,
            userName: curr.userName,
            totalSteps: 0
          };
        }
        acc[curr.userId].totalSteps += curr.steps;
        return acc;
      }, {});

      setAllTimeLeaderboard(Object.values(totals).sort((a, b) => b.totalSteps - a.totalSteps));
    });

    return () => {
      weekUnsubscribe();
      allWeeksUnsubscribe();
    };
  }, [currentWeek]);

  // Prepare data for combined chart - Fixed data formatting
  const chartData = weekRanges.map(week => {
    const weekData: { [key: string]: any } = { week: `Week ${week}` };
    const usersInWeek = weeklyData.filter(d => d.week === week);
    
    // Initialize all users with 0 steps
    [...new Set(weeklyData.map(d => d.userName))].forEach(userName => {
      weekData[userName] = 0;
    });
    
    // Update steps for users who have data
    usersInWeek.forEach(userData => {
      weekData[userData.userName] = userData.steps;
    });
    
    return weekData;
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  const uniqueUsers = [...new Set(weeklyData.map(d => d.userName))];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">Weekly Leaderboard 🏆</h3>
        <Select
          value={currentWeek.toString()}
          onValueChange={(value) => setCurrentWeek(Number(value))}
        >
          <SelectTrigger className="w-[180px] bg-white/50 backdrop-blur-sm">
            <SelectValue placeholder="Select week" />
          </SelectTrigger>
          <SelectContent>
            {weekRanges.map((week) => (
              <SelectItem key={week} value={week.toString()}>
                Week {week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weekly Leaderboard */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-8 bg-white/30 backdrop-blur-sm rounded-lg">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No steps recorded for this week yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className={`flex items-center justify-between p-4 rounded-lg transition-all duration-300 ${
                index === 0 
                  ? 'bg-gradient-to-r from-yellow-100/70 to-amber-100/70 backdrop-blur-sm animate-pulse-subtle'
                  : 'bg-white/30 backdrop-blur-sm hover:bg-white/40'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center">
                  {index === 0 && <Crown className="w-6 h-6 text-yellow-500 animate-bounce" />}
                  {index === 1 && <Medal className="w-6 h-6 text-gray-400" />}
                  {index === 2 && <Medal className="w-6 h-6 text-amber-600" />}
                  {index > 2 && <span className="text-gray-500 font-medium">{index + 1}</span>}
                </div>
                <span className="font-medium">{entry.userName}</span>
              </div>
              <span className="font-semibold">{entry.steps.toLocaleString()} steps</span>
            </div>
          ))}
        </div>
      )}

      {/* All-Time Leaderboard */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
          <ChevronUp className="w-4 h-4" /> All-Time Rankings
        </h3>
        <div className="space-y-2">
          {allTimeLeaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className="flex items-center justify-between p-4 rounded-lg bg-white/30 backdrop-blur-sm hover:bg-white/40 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center">
                  {index === 0 && <Trophy className="w-6 h-6 text-yellow-500" />}
                  {index > 0 && <span className="text-gray-500 font-medium">{index + 1}</span>}
                </div>
                <span className="font-medium">{entry.userName}</span>
              </div>
              <span className="font-semibold">{entry.totalSteps.toLocaleString()} total steps</span>
            </div>
          ))}
        </div>
      </div>

      {/* Combined Steps Chart */}
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
    </div>
  );
};

export default Leaderboard;
