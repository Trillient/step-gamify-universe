
import { ChevronUp, Trophy } from "lucide-react";

interface UserTotalSteps {
  userId: string;
  userName: string;
  totalSteps: number;
}

const AllTimeRanking = ({ allTimeLeaderboard }: { allTimeLeaderboard: UserTotalSteps[] }) => {
  return (
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
  );
};

export default AllTimeRanking;
