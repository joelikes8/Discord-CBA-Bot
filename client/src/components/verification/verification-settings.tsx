import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { VerificationSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function VerificationSettings() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>("");
  
  const { data: settings, isLoading } = useQuery<VerificationSettings>({
    queryKey: ['/api/verification/settings'],
    onSuccess: (data) => {
      setSelectedRole(data.verifiedRole);
    }
  });
  
  const { data: roles, isLoading: isLoadingRoles } = useQuery<string[]>({
    queryKey: ['/api/server/roles'],
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (verifiedRole: string) => {
      const response = await apiRequest('POST', '/api/verification/settings', { verifiedRole });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/verification/settings'] });
      toast({
        title: "Settings updated",
        description: "Verification settings have been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const refreshRobloxConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/verification/refresh-connection', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/verification/settings'] });
      toast({
        title: "Connection refreshed",
        description: "Roblox API connection has been refreshed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to refresh connection",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSaveSettings = () => {
    if (selectedRole) {
      updateSettingsMutation.mutate(selectedRole);
    }
  };
  
  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
  };
  
  const handleRefreshConnection = () => {
    refreshRobloxConnectionMutation.mutate();
  };

  if (isLoading || isLoadingRoles) {
    return (
      <div className="bg-card rounded-lg shadow">
        <div className="border-b border-border p-4">
          <h2 className="font-bold text-lg">Roblox Verification</h2>
          <p className="text-muted-foreground text-sm">Link Discord users with Roblox accounts</p>
        </div>
        
        <div className="p-4">
          <Skeleton className="h-48 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!settings || !roles) {
    return (
      <div className="bg-card rounded-lg shadow p-4">
        <div className="text-center text-muted-foreground">
          Unable to load verification settings
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow">
      <div className="border-b border-border p-4">
        <h2 className="font-bold text-lg">Roblox Verification</h2>
        <p className="text-muted-foreground text-sm">Link Discord users with Roblox accounts</p>
      </div>
      
      <div className="p-4">
        <div className="p-3 bg-background rounded-md mb-4">
          <h3 className="font-medium mb-2">Verification Commands</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-muted p-2 rounded flex items-center">
              <div className="bg-primary text-primary-foreground p-1 rounded text-xs font-mono mr-2">/verify</div>
              <span className="text-muted-foreground text-sm">Link Roblox account</span>
            </div>
            <div className="bg-muted p-2 rounded flex items-center">
              <div className="bg-primary text-primary-foreground p-1 rounded text-xs font-mono mr-2">/reverify</div>
              <span className="text-muted-foreground text-sm">Re-link account</span>
            </div>
            <div className="bg-muted p-2 rounded flex items-center">
              <div className="bg-primary text-primary-foreground p-1 rounded text-xs font-mono mr-2">/promote</div>
              <span className="text-muted-foreground text-sm">[username] [rank]</span>
            </div>
            <div className="bg-muted p-2 rounded flex items-center">
              <div className="bg-primary text-primary-foreground p-1 rounded text-xs font-mono mr-2">/whois</div>
              <span className="text-muted-foreground text-sm">Check linked account</span>
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-background rounded-md mb-4">
          <h3 className="font-medium mb-2">Roblox API Connection</h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span className={settings.robloxApiConnected ? "text-[hsl(150,86%,65%)]" : "text-destructive"}>
              {settings.robloxApiConnected ? (
                <>
                  <CheckCircle className="inline-block mr-1 h-4 w-4" /> Connected to Roblox API
                </>
              ) : (
                <>
                  <span className="inline-block mr-1">⚠️</span> Not connected to Roblox API
                </>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshConnection}
              disabled={refreshRobloxConnectionMutation.isPending}
              className="mt-2 sm:mt-0"
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              {refreshRobloxConnectionMutation.isPending ? 'Refreshing...' : 'Refresh Connection'}
            </Button>
          </div>
        </div>
        
        <div className="mt-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Verified Role</label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!selectedRole || updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Verification Settings'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
