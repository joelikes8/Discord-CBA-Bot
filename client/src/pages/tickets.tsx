import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket as TicketIcon, MessageSquare } from "lucide-react";
import { Ticket } from "@shared/schema";

export default function Tickets() {
  const { data: allTickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/tickets/all'],
  });
  
  const openTickets = allTickets?.filter(ticket => ticket.status === 'open');
  const closedTickets = allTickets?.filter(ticket => ticket.status === 'closed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-[hsl(60,86%,65%)] text-black">Open</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-muted-foreground">Closed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Support Tickets</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TicketIcon className="mr-2 h-5 w-5 text-primary" />
            Ticket Management
          </CardTitle>
          <CardDescription>Handle support requests from server members</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open">
            <TabsList className="mb-4">
              <TabsTrigger value="open">
                Open Tickets
                {openTickets && <Badge variant="secondary" className="ml-2">{openTickets.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed Tickets
                {closedTickets && <Badge variant="secondary" className="ml-2">{closedTickets.length}</Badge>}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="open">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex space-x-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                openTickets && openTickets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>#{ticket.id}</TableCell>
                          <TableCell>{ticket.userId}</TableCell>
                          <TableCell>{ticket.issue}</TableCell>
                          <TableCell>{new Date(ticket.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <MessageSquare className="h-4 w-4 mr-1" /> Reply
                              </Button>
                              <Button variant="destructive" size="sm">Close</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TicketIcon className="mx-auto h-12 w-12 mb-2 opacity-20" />
                    <p>No open tickets</p>
                  </div>
                )
              )}
            </TabsContent>
            
            <TabsContent value="closed">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex space-x-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                closedTickets && closedTickets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Closed</TableHead>
                        <TableHead>Closed By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>#{ticket.id}</TableCell>
                          <TableCell>{ticket.userId}</TableCell>
                          <TableCell>{ticket.issue}</TableCell>
                          <TableCell>{ticket.closedAt ? new Date(ticket.closedAt).toLocaleString() : 'N/A'}</TableCell>
                          <TableCell>{ticket.closedBy || 'N/A'}</TableCell>
                          <TableCell>{ticket.closedReason || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TicketIcon className="mx-auto h-12 w-12 mb-2 opacity-20" />
                    <p>No closed tickets</p>
                  </div>
                )
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
