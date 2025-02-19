
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const StepInput = () => {
  const [steps, setSteps] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Generate weeks for 2025
  const getWeeks = () => {
    const weeks = [];
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");
    
    for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 7)) {
      const weekNumber = Math.ceil((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekStart = new Date(date);
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      weeks.push({
        value: weekNumber.toString(),
        label: `Week ${weekNumber} (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()})`,
      });
    }
    return weeks;
  };

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
      const docRef = doc(db, "steps", `${user.uid}-week-${selectedWeek}-2025`);
      await setDoc(docRef, {
        userId: user.uid,
        userName: user.displayName,
        steps: Number(steps),
        week: Number(selectedWeek),
        year: 2025,
        timestamp: Date.now(),
      });

      toast({
        title: "Success!",
        description: "Your steps have been recorded.",
      });
      setSteps("");
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
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a week" />
          </SelectTrigger>
          <SelectContent>
            {getWeeks().map((week) => (
              <SelectItem key={week.value} value={week.value}>
                {week.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Steps for the selected week</label>
        <Input
          type="number"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="Enter your steps"
          min="0"
          className="w-full"
        />
      </div>

      <Button 
        type="submit" 
        disabled={loading || !selectedWeek || !steps} 
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          "Save Steps"
        )}
      </Button>
    </form>
  );
};

export default StepInput;
