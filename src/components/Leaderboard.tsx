
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Trophy } from "lucide-react";

interface StepData {
  userId: string;
  userName: string;
  steps: number;
  week: number;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<StepData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const currentWeek = Math.floor((Date.now() - new Date("2023-10-01").getTime()) / (7 * 24 * 60 * 60 * 1000));
        const q = query(collection(db, "steps"), where("week", "==", currentWeek));
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
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading leaderboard...</div>;
  }

  return (
    <div className="space-y-4">
      {leaderboard.map((entry, index) => (
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
      ))}
    </div>
  );
};

export default Leaderboard;
