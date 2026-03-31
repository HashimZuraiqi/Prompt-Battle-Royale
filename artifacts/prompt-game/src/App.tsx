import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import HostSetup from "@/pages/host-setup";
import HostPanel from "@/pages/host-panel";
import Join from "@/pages/join";
import PlayerView from "@/pages/player-view";
import Leaderboard from "@/pages/leaderboard";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/host" component={HostSetup} />
      <Route path="/host/room/:code" component={HostPanel} />
      <Route path="/join" component={Join} />
      <Route path="/play/:code" component={PlayerView} />
      <Route path="/leaderboard/:code" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
