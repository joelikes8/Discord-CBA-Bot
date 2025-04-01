import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { SecurityState } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bomb, UserMinus, Globe, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SecurityFeatures() {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<SecurityState | null>(null);
  
  const { data: settings, isLoading } = useQuery<SecurityState>({
    queryKey: ['/api/security/settings'],
    onSuccess: (data) => {
      if (!localSettings) {
        setLocalSettings(data);
      }
    }
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: SecurityState) => {
      const response = await apiRequest('POST', '/api/security/settings', newSettings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security/settings'] });
      toast({
        title: "Settings updated",
        description: "Security settings have been successfully updated.",
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
  
  const handleToggleChange = (setting: keyof SecurityState) => (checked: boolean) => {
    if (localSettings) {
      setLocalSettings({
        ...localSettings,
        [setting]: checked
      });
    }
  };
  
  const handleUpdateSettings = () => {
    if (localSettings) {
      updateSettingsMutation.mutate(localSettings);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow mb-6">
        <div className="border-b border-border p-4">
          <h2 className="font-bold text-lg">Security Features</h2>
          <p className="text-muted-foreground text-sm">Configure protection settings</p>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-background rounded-md">
                <div className="flex items-start">
                  <Skeleton className="h-8 w-8 mr-3" />
                  <div>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-end">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  const effectiveSettings = localSettings || settings;
  
  if (!effectiveSettings) {
    return (
      <div className="bg-card rounded-lg shadow mb-6 p-4">
        <div className="text-center text-muted-foreground">
          Unable to load security settings
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow mb-6">
      <div className="border-b border-border p-4">
        <h2 className="font-bold text-lg">Security Features</h2>
        <p className="text-muted-foreground text-sm">Configure protection settings</p>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {/* Anti-Nuke */}
          <div className="flex items-center justify-between p-3 bg-background rounded-md">
            <div className="flex items-start">
              <div className="text-[hsl(150,86%,65%)] text-xl mr-3 mt-1">
                <Bomb size={20} />
              </div>
              <div>
                <h3 className="font-medium">Anti-Nuke Protection</h3>
                <p className="text-muted-foreground text-sm">Prevents mass channel/role deletion and server destruction</p>
              </div>
            </div>
            <Switch 
              checked={effectiveSettings.antiNuke} 
              onCheckedChange={handleToggleChange('antiNuke')}
            />
          </div>
          
          {/* Anti-Hack */}
          <div className="flex items-center justify-between p-3 bg-background rounded-md">
            <div className="flex items-start">
              <div className="text-[hsl(60,86%,65%)] text-xl mr-3 mt-1">
                <UserX size={20} />
              </div>
              <div>
                <h3 className="font-medium">Anti-Hack Protection</h3>
                <p className="text-muted-foreground text-sm">Detects suspicious activity patterns and unauthorized access</p>
              </div>
            </div>
            <Switch 
              checked={effectiveSettings.antiHack} 
              onCheckedChange={handleToggleChange('antiHack')}
            />
          </div>
          
          {/* Anti-Raid */}
          <div className="flex items-center justify-between p-3 bg-background rounded-md">
            <div className="flex items-start">
              <div className="text-destructive text-xl mr-3 mt-1">
                <UserMinus size={20} />
              </div>
              <div>
                <h3 className="font-medium">Anti-Raid Protection</h3>
                <p className="text-muted-foreground text-sm">Prevents mass user joins and coordinates attacks</p>
              </div>
            </div>
            <Switch 
              checked={effectiveSettings.antiRaid} 
              onCheckedChange={handleToggleChange('antiRaid')}
            />
          </div>
          
          {/* Website Filter */}
          <div className="flex items-center justify-between p-3 bg-background rounded-md">
            <div className="flex items-start">
              <div className="text-primary text-xl mr-3 mt-1">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-medium">Website Filter</h3>
                <p className="text-muted-foreground text-sm">Blocks suspicious links while allowing Roblox and Google Docs</p>
              </div>
            </div>
            <Switch 
              checked={effectiveSettings.websiteFilter} 
              onCheckedChange={handleToggleChange('websiteFilter')}
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleUpdateSettings} 
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? 'Updating...' : 'Update Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
