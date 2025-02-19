
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Trophy, Crown, Medal } from "lucide-react";

interface StepData {
  userId: string;
  userName: string;
  steps: number;
  week: number;
  year: number;
  startDate: string;
  endDate: string;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<StepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<number>(1);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 9, 1); // October 1st
    const now = Date.now();
    const weekNumber = Math.ceil((now - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setCurrentWeek(Math.max(1, weekNumber));
  }, []);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const q = query(
      collection(db, "steps"),
      where("year", "==", currentYear),
      where("week", "==", currentWeek)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: StepData[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data() as StepData);
      });
      setLeaderboard(data.sort((a, b) => b.steps - a.steps));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWeek]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-500 mb-4">
        Week {currentWeek} Leaderboard 🏆
      </h3>
      {leaderboard.length === 0 ? (
        <div className="text-center py-8 bg-white/30 backdrop-blur-sm rounded-lg">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No steps recorded for this week yet</p>
        </div>
      ) : (
        leaderboard.map((entry, index) => (
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
        ))
      )}
    </div>
  );
};

export default Leaderboard;
