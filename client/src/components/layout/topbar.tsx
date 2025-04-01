import { Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Topbar() {
  const { toast } = useToast();

  const handleSyncBot = () => {
    toast({
      title: "Bot Sync Initiated",
      description: "Synchronizing bot settings with Discord...",
    });
    
    // This would call an API endpoint in a real implementation
  };

  return (
    <header className="bg-background border-b border-border p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Server Security Dashboard</h1>
          <p className="text-muted-foreground text-sm">Protecting your Discord server</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="default" 
            className="bg-[hsl(150,86%,65%)] hover:bg-[hsl(150,86%,60%)]"
            size="sm"
            onClick={handleSyncBot}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Sync Bot
          </Button>
          <div className="relative">
            <button className="text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </button>
            <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">
              3
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
