import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { GuildData } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Bot, LogOut, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const botSettingsSchema = z.object({
  prefix: z.string().min(1, "Prefix cannot be empty"),
  logChannelId: z.string().optional(),
  deleteCommands: z.boolean().default(false),
  debugMode: z.boolean().default(false),
});

type BotSettingsFormValues = z.infer<typeof botSettingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  
  const { data: guild, isLoading: isLoadingGuild } = useQuery<GuildData>({
    queryKey: ['/api/server/info'],
  });
  
  const { data: settings, isLoading: isLoadingSettings } = useQuery<BotSettingsFormValues>({
    queryKey: ['/api/settings'],
  });
  
  const { data: channels, isLoading: isLoadingChannels } = useQuery<string[]>({
    queryKey: ['/api/server/channels'],
  });
  
  const form = useForm<BotSettingsFormValues>({
    resolver: zodResolver(botSettingsSchema),
    defaultValues: {
      prefix: "!",
      deleteCommands: false,
      debugMode: false,
    },
    values: settings,
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: BotSettingsFormValues) => {
      const response = await apiRequest('POST', '/api/settings', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings updated",
        description: "Bot settings have been successfully updated.",
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
  
  const onSubmit = (data: BotSettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  const resetBotMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/bot/reset', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bot reset",
        description: "The bot has been successfully reset.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to reset bot",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleResetBot = () => {
    if (confirm("Are you sure you want to reset the bot? This will clear all settings.")) {
      resetBotMutation.mutate();
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Bot Settings</h1>
      
      {/* Server Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="mr-2 h-5 w-5 text-primary" />
            Server Information
          </CardTitle>
          <CardDescription>Information about the Discord server</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGuild ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-40" />
            </div>
          ) : guild ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Server Name:</span>
                <span className="font-medium">{guild.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Server ID:</span>
                <span className="font-mono text-sm">{guild.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Count:</span>
                <span>{guild.memberCount} members</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner:</span>
                <span>{guild.owner.username}#{guild.owner.discriminator}</span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Error loading server information</div>
          )}
        </CardContent>
      </Card>
      
      {/* Bot Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="mr-2 h-5 w-5 text-primary" />
            Bot Configuration
          </CardTitle>
          <CardDescription>Customize how the security bot works in your server</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSettings || isLoadingChannels ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Command Prefix</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="!" />
                      </FormControl>
                      <FormDescription>
                        The prefix used before commands (e.g., !verify)
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="logChannelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Log Channel</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a channel for logs" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {channels?.map((channel) => (
                            <SelectItem key={channel} value={channel}>
                              {channel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Channel where security events will be logged
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="deleteCommands"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Delete Command Messages</FormLabel>
                          <FormDescription>
                            Automatically delete command messages after execution
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="debugMode"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Debug Mode</FormLabel>
                          <FormDescription>
                            Enable detailed logging for troubleshooting
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleResetBot}
                    disabled={resetBotMutation.isPending}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    {resetBotMutation.isPending ? 'Resetting...' : 'Reset Bot'}
                  </Button>
                  
                  <Button 
                    type="submit" 
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
