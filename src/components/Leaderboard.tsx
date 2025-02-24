import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import WeekSelector from "./leaderboard/WeekSelector";
import WeeklyRanking from "./leaderboard/WeeklyRanking";
import AllTimeRanking from "./leaderboard/AllTimeRanking";
import ProgressChart from "./leaderboard/ProgressChart";
import { StepData, UserTotalSteps } from "./leaderboard/types";

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

  // Prepare data for combined chart
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

  const uniqueUsers = [...new Set(weeklyData.map(d => d.userName))];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WeekSelector 
        currentWeek={currentWeek}
        weekRanges={weekRanges}
        onWeekChange={setCurrentWeek}
      />
      <WeeklyRanking leaderboard={leaderboard} />
      <AllTimeRanking allTimeLeaderboard={allTimeLeaderboard} />
      <ProgressChart 
        weeklyData={weeklyData}
        weekRanges={weekRanges}
      />
    </div>
  );
};

export default Leaderboard;
