
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Trophy, TrendingUp, Users } from "lucide-react";
import StepInput from "./StepInput";
import Leaderboard from "./Leaderboard";
import WeeklyChart from "./WeeklyChart";

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen w-full dot-pattern">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100 opacity-90" />
      
      <div className="relative container mx-auto p-4 space-y-6 pt-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.displayName}!</h1>
          <Button variant="ghost" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card p-6 col-span-full md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Your Progress
              </h2>
            </div>
            <WeeklyChart />
          </Card>

          <Card className="glass-card p-6 col-span-full md:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5" /> Weekly Steps
              </h2>
            </div>
            <StepInput />
          </Card>

          <Card className="glass-card p-6 col-span-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" /> Family Leaderboard
              </h2>
            </div>
            <Leaderboard />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
