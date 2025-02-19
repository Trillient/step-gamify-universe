
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const StepInput = () => {
  const [steps, setSteps] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steps || !user) return;

    setLoading(true);
    try {
      const currentWeek = Math.floor((Date.now() - new Date("2023-10-01").getTime()) / (7 * 24 * 60 * 60 * 1000));
      await setDoc(doc(db, "steps", `${user.uid}-week-${currentWeek}`), {
        userId: user.uid,
        userName: user.displayName,
        steps: Number(steps),
        week: currentWeek,
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
        description: "Failed to save your steps.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="number"
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        placeholder="Enter your steps for this week"
        min="0"
        className="w-full"
      />
      <Button type="submit" disabled={loading} className="w-full">
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
