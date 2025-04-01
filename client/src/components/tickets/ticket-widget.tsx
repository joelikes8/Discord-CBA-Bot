import { useQuery } from "@tanstack/react-query";
import { Ticket } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function TicketWidget() {
  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/tickets/list'],
  });

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'open':
        return "bg-[hsl(60,86%,65%)]";
      case 'inProgress':
        return "bg-primary";
      case 'closed':
        return "bg-[hsl(150,86%,65%)]";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow">
        <div className="border-b border-border p-4">
          <h2 className="font-bold text-lg">Open Tickets</h2>
          <p className="text-muted-foreground text-sm">Support requests from members</p>
        </div>
        
        <div className="p-2 max-h-64 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 hover:bg-background rounded-md">
              <div className="flex items-center">
                <Skeleton className="w-2 h-2 rounded-full mr-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-border">
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow">
      <div className="border-b border-border p-4">
        <h2 className="font-bold text-lg">Open Tickets</h2>
        <p className="text-muted-foreground text-sm">Support requests from members</p>
      </div>
      
      <div className="p-2 max-h-64 overflow-y-auto">
        {tickets && tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between p-2 hover:bg-background rounded-md">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${getStatusDot(ticket.status)} mr-2`}></div>
                <span className="text-sm">{ticket.title} - {ticket.user}</span>
              </div>
              <span className="text-muted-foreground text-xs">{ticket.timeAgo}</span>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No open tickets
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-border">
        <Button className="w-full" variant="default">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
          </svg>
          Manage Tickets
        </Button>
      </div>
    </div>
  );
}
