import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardHeaderProps {
  userRole?: string;
}

export const DashboardHeader = ({ userRole }: DashboardHeaderProps) => {
  const { data: userData } = useQuery({
    queryKey: ["userData"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      return user;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <img 
          src="/Tappio.png" 
          alt="Tappio Logo" 
          className="h-16 object-contain"
        />
      </div>
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {userData && (
            <p className="text-muted-foreground">
              Hey {userData.email?.split('@')[0]}! 👋
            </p>
          )}
        </div>
      </div>
    </div>
  );
};