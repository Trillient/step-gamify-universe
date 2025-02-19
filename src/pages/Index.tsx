
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { user, signInWithGoogle } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen w-full dot-pattern flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100 opacity-90" />
        <Card className="glass-card z-10 p-8 max-w-md w-full text-center space-y-6 animate-float">
          <h1 className="text-3xl font-bold tracking-tight">Family Steps Challenge</h1>
          <p className="text-gray-600">Join the family competition and track your progress!</p>
          <Button
            onClick={signInWithGoogle}
            className="w-full gap-2 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black transition-all duration-300"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Google
          </Button>
        </Card>
      </div>
    );
  }

  return <Dashboard />;
};

export default Index;
