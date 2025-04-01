import { Link } from "wouter";
import {
  LayoutDashboard, 
  ShieldAlert, 
  UserCheck, 
  Gavel, 
  Ticket, 
  List, 
  Settings, 
  User
} from "lucide-react";

type SidebarProps = {
  currentPath: string;
};

export default function Sidebar({ currentPath }: SidebarProps) {
  const links = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/security", icon: ShieldAlert, label: "Security" },
    { path: "/verification", icon: UserCheck, label: "Verification" },
    { path: "/moderation", icon: Gavel, label: "Moderation" },
    { path: "/tickets", icon: Ticket, label: "Tickets" },
    { path: "/logs", icon: List, label: "Logs" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="bg-sidebar w-full md:w-16 lg:w-56 flex flex-row md:flex-col justify-between md:justify-start overflow-hidden">
      {/* Server selection (mobile only) */}
      <div className="flex md:hidden items-center px-4 h-14 bg-sidebar border-b border-sidebar-border">
        <span className="font-bold text-sidebar-foreground truncate">SecurityBot</span>
      </div>
      
      {/* Main sidebar section */}
      <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto flex-grow">
        {/* Server info */}
        <div className="hidden md:flex items-center px-4 h-14 bg-sidebar border-b border-sidebar-border">
          <span className="hidden lg:block font-bold text-sidebar-foreground truncate">SecurityBot</span>
          <ShieldAlert className="text-sidebar-primary md:block lg:hidden mx-auto" size={20} />
        </div>
        
        {/* Navigation items */}
        <nav className="flex md:flex-col py-2">
          {links.map((link) => (
            <Link key={link.path} href={link.path}>
              <a className={`sidebar-item ${
                currentPath === link.path 
                  ? "sidebar-item-active" 
                  : "sidebar-item-inactive"
              }`}>
                <link.icon className="w-5 h-5" />
                <span className="ml-3 hidden lg:block">{link.label}</span>
              </a>
            </Link>
          ))}
        </nav>
      </div>
      
      {/* User section */}
      <div className="hidden md:flex items-center p-2 bg-sidebar border-t border-sidebar-border">
        <div className="flex items-center px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <User size={16} />
          </div>
          <div className="ml-2 hidden lg:block">
            <div className="text-sm font-medium text-sidebar-foreground">Admin</div>
            <div className="text-xs text-sidebar-foreground/70">#1234</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
