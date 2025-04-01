import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Security from "@/pages/security";
import Verification from "@/pages/verification";
import Tickets from "@/pages/tickets";
import Settings from "@/pages/settings";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";

function Router() {
  const [location] = useLocation();
  
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <Sidebar currentPath={location} />
      
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <Topbar />
        
        <div className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/security" component={Security} />
            <Route path="/verification" component={Verification} />
            <Route path="/tickets" component={Tickets} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
