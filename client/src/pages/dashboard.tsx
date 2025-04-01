import StatsOverview from "@/components/dashboard/stats-overview";
import ActivityPanel from "@/components/dashboard/activity-panel";
import CommandDocumentation from "@/components/dashboard/command-documentation";
import SecurityFeatures from "@/components/security/security-features";
import VerificationSettings from "@/components/verification/verification-settings";
import TicketWidget from "@/components/tickets/ticket-widget";

export default function Dashboard() {
  return (
    <div className="p-4">
      {/* Stats overview */}
      <StatsOverview />
      
      {/* Main sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security features and verification settings */}
        <div className="lg:col-span-2">
          <SecurityFeatures />
          <VerificationSettings />
        </div>
        
        {/* Activity and tickets sidebar */}
        <div>
          <ActivityPanel />
          <TicketWidget />
        </div>
      </div>
      
      {/* Command examples section */}
      <CommandDocumentation />
    </div>
  );
}
