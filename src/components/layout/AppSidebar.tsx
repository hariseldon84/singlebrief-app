import { useState } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import { 
  FileText, 
  Users, 
  FileStack, 
  Settings, 
  LogOut,
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
import { useAuth } from "@/contexts/AuthContext";

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
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const handleNewBrief = () => {
    navigate('/briefs/new');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-accent-foreground font-sora font-bold text-sm">SB</span>
            </div>
            <span className="font-sora font-semibold text-lg">SingleBrief</span>
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

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          size={isCollapsed ? "icon" : "default"}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2 font-inter">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}