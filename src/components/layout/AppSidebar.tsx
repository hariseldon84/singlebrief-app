
import { useState } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import { 
  FileText, 
  Users, 
  FileStack, 
  Settings, 
  Plus,
  Home
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const items = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Briefs", url: "/briefs", icon: FileText },
  { title: "Teams", url: "/teams", icon: Users },
  { title: "Templates", url: "/templates", icon: FileStack },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const handleNewBrief = () => {
    navigate('/briefs/new');
  };

  const handleProfileClick = () => {
    navigate('/settings');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        console.log('Fetched profile:', data);
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
    
    // Listen for profile updates
    const channel = supabase
      .channel('profile-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        console.log('Profile updated:', payload.new);
        setProfile(payload.new);
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        {!isCollapsed ? (
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
            onClick={handleProfileClick}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} alt="Profile" />
              <AvatarFallback className="text-sm">
                {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="font-inter text-sm font-medium truncate">
              {profile?.name || user?.email}
            </span>
          </div>
        ) : (
          <div 
            className="flex justify-center cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
            onClick={handleProfileClick}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} alt="Profile" />
              <AvatarFallback className="text-sm">
                {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="mb-4 px-2">
              <Button 
                onClick={handleNewBrief}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
                size={isCollapsed ? "icon" : "default"}
              >
                <Plus className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">New Brief</span>}
              </Button>
            </div>
            
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span className="font-inter">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
