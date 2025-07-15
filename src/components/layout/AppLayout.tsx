import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        console.log('Fetched profile:', data); // Debug log
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
    
    // Listen for profile updates with better error handling
    const channel = supabase
      .channel('profile-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        console.log('Profile updated:', payload.new); // Debug log
        setProfile(payload.new);
      })
      .subscribe((status) => {
        console.log('Subscription status:', status); // Debug log
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b bg-background px-4">
            <div className="flex items-center">
              <SidebarTrigger className="mr-2" />
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="font-inter text-sm font-medium">{profile?.name || user?.email}</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} alt="Profile" />
                <AvatarFallback className="text-sm">
                  {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          
          <main className="flex-1 p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}