import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Trophy, Edit2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WeekRange {
  start: Date;
  end: Date;
  weekNumber: number;
}

const StepInput = () => {
  const [steps, setSteps] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [weekRanges, setWeekRanges] = useState<WeekRange[]>([]);
  const [existingSteps, setExistingSteps] = useState<{ [key: string]: number }>({});
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const ranges: WeekRange[] = [];
    const startDate = new Date(currentYear, 9, 1);
    const endDate = new Date(currentYear, 11, 18);

    let currentDate = new Date(startDate);
    let weekNumber = 1;

    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      ranges.push({
        start: weekStart,
        end: weekEnd,
        weekNumber: weekNumber,
      });

      currentDate.setDate(currentDate.getDate() + 7);
      weekNumber++;
    }

    setWeekRanges(ranges);
  }, []);

  useEffect(() => {
    if (!user) return;

    const currentYear = new Date().getFullYear();
    const q = query(
      collection(db, "steps"),
      where("userId", "==", user.uid),
      where("year", "==", currentYear)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const steps: { [key: string]: number } = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        steps[data.week] = data.steps;
      });
      setExistingSteps(steps);
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    if (selectedWeek && existingSteps[selectedWeek]) {
      setSteps(existingSteps[selectedWeek].toString());
    } else {
      setSteps("");
    }
  }, [selectedWeek, existingSteps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steps || !user || !selectedWeek) {
      toast({
        title: "Error",
        description: "Please enter your steps and select a week",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const weekData = weekRanges[Number(selectedWeek) - 1];
      const docRef = doc(db, "steps", `${user.uid}-week-${selectedWeek}-${weekData.start.getFullYear()}`);
      
      await setDoc(docRef, {
        userId: user.uid,
        userName: user.displayName,
        steps: Number(steps),
        week: Number(selectedWeek),
        year: weekData.start.getFullYear(),
        startDate: weekData.start.toISOString(),
        endDate: weekData.end.toISOString(),
        timestamp: Date.now(),
      });

      const action = existingSteps[selectedWeek] ? "updated" : "recorded";
      toast({
        title: "Success! 🎉",
        description: `Your steps have been ${action}. Keep up the great work!`,
      });
      setSteps("");
      setSelectedWeek("");
    } catch (error) {
      console.error("Error saving steps:", error);
      toast({
        title: "Error",
        description: "Failed to save your steps. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Select Week
        </label>
        <Select
          value={selectedWeek}
          onValueChange={setSelectedWeek}
        >
          <SelectTrigger className="w-full bg-white/50 backdrop-blur-sm">
            <SelectValue placeholder="Choose a week" />
          </SelectTrigger>
          <SelectContent>
            {weekRanges.map((week) => (
              <SelectItem 
                key={week.weekNumber} 
                value={week.weekNumber.toString()}
                className="py-3 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-between w-full">
                  <span>Week {week.weekNumber} ({formatDate(week.start)} - {formatDate(week.end)})</span>
                  {existingSteps[week.weekNumber] && (
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Trophy className="w-4 h-4" /> {existingSteps[selectedWeek] ? "Update" : "Enter"} Steps
        </label>
        <Input
          type="number"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="Enter your steps"
          min="0"
          className="w-full bg-white/50 backdrop-blur-sm"
        />
      </div>

      <Button 
        type="submit" 
        disabled={loading || !selectedWeek || !steps} 
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          existingSteps[selectedWeek] ? "Update Steps" : "Save Steps"
        )}
      </Button>
    </form>
  );
};

export default StepInput;
