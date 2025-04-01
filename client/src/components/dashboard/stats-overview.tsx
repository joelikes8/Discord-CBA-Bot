import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Ban, UserCheck, Ticket } from "lucide-react";
import { ServerStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsOverview() {
  const { data: stats, isLoading } = useQuery<ServerStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-8 w-24 mb-3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div className="text-muted-foreground">Unable to load statistics</div>;
  }

  const securityScoreDiff = stats.securityScore - (stats.lastSecurityScore || 0);
  const threatsDiff = stats.threatsBlocked - (stats.lastThreatsBlocked || 0);
  const verifiedDiff = stats.verifiedMembers - (stats.lastVerifiedMembers || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Security Score</p>
            <p className="text-2xl font-bold">{stats.securityScore}/100</p>
          </div>
          <div className="text-[hsl(150,86%,65%)] text-3xl">
            <ShieldAlert />
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className={securityScoreDiff >= 0 ? "text-[hsl(150,86%,65%)]" : "text-destructive"}>
            {securityScoreDiff > 0 && "↑"}
            {securityScoreDiff < 0 && "↓"}
            {securityScoreDiff !== 0 && ` ${Math.abs(securityScoreDiff)} points`}
          </span>
          {securityScoreDiff !== 0 && " since last week"}
        </div>
      </div>
      
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Threats Blocked</p>
            <p className="text-2xl font-bold">{stats.threatsBlocked}</p>
          </div>
          <div className="text-destructive text-3xl">
            <Ban />
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className={threatsDiff > 0 ? "text-destructive" : "text-[hsl(150,86%,65%)]"}>
            {threatsDiff > 0 && "↑"}
            {threatsDiff < 0 && "↓"}
            {threatsDiff !== 0 && ` ${Math.abs(threatsDiff)} threats`}
          </span>
          {threatsDiff !== 0 && " in the last 7 days"}
        </div>
      </div>
      
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Verified Members</p>
            <p className="text-2xl font-bold">{stats.verifiedMembers}/{stats.totalMembers}</p>
          </div>
          <div className="text-primary text-3xl">
            <UserCheck />
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className={verifiedDiff >= 0 ? "text-primary" : "text-destructive"}>
            {verifiedDiff > 0 && "↑"}
            {verifiedDiff < 0 && "↓"}
            {verifiedDiff !== 0 && ` ${Math.abs(verifiedDiff)} new`}
          </span>
          {verifiedDiff !== 0 && " verifications this week"}
        </div>
      </div>
      
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Open Tickets</p>
            <p className="text-2xl font-bold">{stats.openTickets}</p>
          </div>
          <div className="text-[hsl(60,86%,65%)] text-3xl">
            <Ticket />
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="text-[hsl(60,86%,65%)]">
            {stats.needAttention} tickets
          </span>
          {stats.needAttention > 0 && " need your attention"}
        </div>
      </div>
    </div>
  );
}
