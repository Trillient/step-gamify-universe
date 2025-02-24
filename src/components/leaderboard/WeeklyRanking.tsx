
import { Crown, Medal, Trophy } from "lucide-react";

interface StepData {
  userId: string;
  userName: string;
  steps: number;
  week: number;
  year: number;
  startDate: string;
  endDate: string;
}

const WeeklyRanking = ({ leaderboard }: { leaderboard: StepData[] }) => {
  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-8 bg-white/30 backdrop-blur-sm rounded-lg">
        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">No steps recorded for this week yet</p>
      </div>
    );
  }

  return (
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
  );
};

export default WeeklyRanking;
