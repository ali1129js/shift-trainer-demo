import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { MockAuthProvider, useAuth } from "@/auth";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/AppShell";
import { Anmelden } from "@/pages/Anmelden";
import { Uebersicht } from "@/pages/Uebersicht";
import { Schichten } from "@/pages/Schichten";
import { Ablauf } from "@/pages/Ablauf";
import { Berichte } from "@/pages/Berichte";
import { Wissen } from "@/pages/Wissen";
import { Aggregation } from "@/pages/Aggregation";
import { NichtGefunden } from "@/pages/NichtGefunden";
import { TrainingUebersicht } from "@/pages/training/TrainingUebersicht";
import { SchichtReport } from "@/pages/training/SchichtReport";
import { KennungAkteSeite } from "@/pages/training/KennungAkte";

function Inhalt() {
  const { status } = useAuth();
  if (status !== "angemeldet") return <Anmelden />;
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Uebersicht} />
        <Route path="/schichten" component={Schichten} />
        <Route path="/schichten/:id" component={Ablauf} />
        <Route path="/berichte" component={Berichte} />
        <Route path="/wissen" component={Wissen} />
        <Route path="/aggregation" component={Aggregation} />
        <Route path="/training" component={TrainingUebersicht} />
        <Route path="/training/schicht/:id" component={SchichtReport} />
        <Route path="/training/kennung/:kennung" component={KennungAkteSeite} />
        <Route>
          <NichtGefunden />
        </Route>
      </Switch>
    </AppShell>
  );
}

/** Demo auth provider (fictional directory, no real sign-in). */
export function App() {
  return (
    <RepositoryProvider>
      <MockAuthProvider>
        <ToastProvider>
          <Router hook={useHashLocation}>
            <Inhalt />
          </Router>
        </ToastProvider>
      </MockAuthProvider>
    </RepositoryProvider>
  );
}
