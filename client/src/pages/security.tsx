import { useQuery } from "@tanstack/react-query";
import SecurityFeatures from "@/components/security/security-features";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityEvent } from "@/lib/types";
import { Shield, AlertTriangle } from "lucide-react";

export default function Security() {
  const { data: securityLogs, isLoading: isLoadingLogs } = useQuery<ActivityEvent[]>({
    queryKey: ['/api/security/logs'],
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Security Management</h1>
      
      {/* Security features */}
      <SecurityFeatures />
      
      {/* Security logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-primary" />
            Security Logs
          </CardTitle>
          <CardDescription>Recent security events and actions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          ) : (
            securityLogs && securityLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">{log.timeAgo}</TableCell>
                      <TableCell>{log.type}</TableCell>
                      <TableCell>
                        <span className="font-medium">{log.title}</span> {log.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-2 opacity-20" />
                <p>No security logs found</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
