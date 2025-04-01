import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, UserCheck, Ticket, AlertTriangle, Settings } from "lucide-react";
import { ActivityEvent } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityPanel() {
  const { data: activities, isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ['/api/dashboard/activity'],
  });

  const getIconComponent = (type: string) => {
    switch (type) {
      case 'antiRaid':
        return <ShieldAlert className="h-4 w-4" />;
      case 'verification':
        return <UserCheck className="h-4 w-4" />;
      case 'ticket':
        return <Ticket className="h-4 w-4" />;
      case 'websiteFilter':
        return <AlertTriangle className="h-4 w-4" />;
      case 'settings':
        return <Settings className="h-4 w-4" />;
      default:
        return <ShieldAlert className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'antiRaid':
        return 'bg-destructive text-destructive-foreground';
      case 'verification':
        return 'bg-[hsl(150,86%,65%)] text-white';
      case 'ticket':
        return 'bg-primary text-primary-foreground';
      case 'websiteFilter':
        return 'bg-[hsl(60,86%,65%)] text-black';
      case 'settings':
        return 'bg-[hsl(150,86%,65%)] text-white';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow mb-6">
        <div className="border-b border-border p-4">
          <h2 className="font-bold text-lg">Recent Activity</h2>
          <p className="text-muted-foreground text-sm">Latest security events</p>
        </div>
        <div className="p-2 max-h-96 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-2 hover:bg-background rounded-md">
              <div className="flex">
                <Skeleton className="flex-shrink-0 w-8 h-8 rounded-full" />
                <div className="ml-3 flex-1">
                  <Skeleton className="h-4 w-full max-w-[200px] mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow mb-6">
      <div className="border-b border-border p-4">
        <h2 className="font-bold text-lg">Recent Activity</h2>
        <p className="text-muted-foreground text-sm">Latest security events</p>
      </div>
      
      <div className="p-2 max-h-96 overflow-y-auto">
        {activities && activities.map((activity) => (
          <div key={activity.id} className="p-2 hover:bg-background rounded-md">
            <div className="flex">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getIconColor(activity.type)} flex items-center justify-center`}>
                {getIconComponent(activity.type)}
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  <span className="font-medium">{activity.title}</span> {activity.description}
                </p>
                <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
              </div>
            </div>
          </div>
        ))}

        {(!activities || activities.length === 0) && (
          <div className="p-4 text-center text-muted-foreground">
            No recent activity to display
          </div>
        )}
      </div>
      
      {activities && activities.length > 0 && (
        <div className="p-2 border-t border-border text-center">
          <a href="#" className="text-primary text-sm hover:underline">View all activity</a>
        </div>
      )}
    </div>
  );
}
