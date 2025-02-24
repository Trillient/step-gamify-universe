
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Moon, Sun, Edit2 } from "lucide-react";
import { useTheme } from "next-themes";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [isEditing, setIsEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Wait until component is mounted to show theme toggle
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure user document exists
  useEffect(() => {
    const ensureUserDocument = async () => {
      if (!user) return;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          displayName: user.displayName,
          email: user.email,
          createdAt: new Date().toISOString(),
        });
      }
    };

    ensureUserDocument().catch(console.error);
  }, [user]);

  const handleUpdateName = async () => {
    if (!user) return;

    try {
      const userDoc = doc(db, "users", user.uid);
      await updateDoc(userDoc, {
        displayName: displayName,
      });

      // Update display name in all step documents
      const stepsQuery = query(
        collection(db, "steps"),
        where("userId", "==", user.uid)
      );
      
      const stepsSnapshot = await getDocs(stepsQuery);
      const batch = writeBatch(db);
      
      stepsSnapshot.forEach((doc) => {
        batch.update(doc.ref, { userName: displayName });
      });
      
      await batch.commit();

      toast({
        title: "Success!",
        description: "Your display name has been updated.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating display name:", error);
      toast({
        title: "Error",
        description: "Failed to update display name.",
        variant: "destructive",
      });
    }
  };

  // Only show theme toggle when mounted
  const themeToggle = mounted ? (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  ) : null;

  return (
    <div className="space-y-6 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" /> Settings
        </h2>
        {themeToggle}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Display Name</label>
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={!isEditing}
            className="bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm"
          />
          {isEditing ? (
            <Button onClick={handleUpdateName}>Save</Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
