
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Trophy } from "lucide-react";

interface StepData {
  userId: string;
  userName: string;
  steps: number;
  week: number;
  year: number;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<StepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<number>(1);

  useEffect(() => {
    // Calculate current week of 2025
    const startOf2025 = new Date("2025-01-01").getTime();
    const now = Date.now();
    const weekNumber = Math.ceil((now - startOf2025) / (7 * 24 * 60 * 60 * 1000));
    setCurrentWeek(Math.max(1, Math.min(weekNumber, 52))); // Ensure week is between 1 and 52
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, "steps"),
          where("year", "==", 2025),
          where("week", "==", currentWeek)
        );
        const querySnapshot = await getDocs(q);
        
        const data: StepData[] = [];
        querySnapshot.forEach((doc) => {
          data.push(doc.data() as StepData);
        });

        setLeaderboard(data.sort((a, b) => b.steps - a.steps));
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentWeek]);

  if (loading) {
    return <div className="text-center py-4">Loading leaderboard...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-500 mb-4">
        Showing results for Week {currentWeek} of 2025
      </h3>
      {leaderboard.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No steps recorded for this week yet
        </div>
      ) : (
        leaderboard.map((entry, index) => (
          <div
            key={entry.userId}
            className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center">
                {index === 0 && <Trophy className="w-6 h-6 text-yellow-500 animate-pulse-subtle" />}
                {index === 1 && <Trophy className="w-6 h-6 text-gray-400" />}
                {index === 2 && <Trophy className="w-6 h-6 text-amber-600" />}
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
