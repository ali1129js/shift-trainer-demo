import { createContext, useContext, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { SchichtRepository } from "@/lib/storage";
import { erstelleRepository } from "./factory";

const RepositoryContext = createContext<SchichtRepository | null>(null);

export function RepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository?: SchichtRepository;
}) {
  const [repo] = useState(() => repository ?? erstelleRepository());
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
          mutations: { retry: false },
        },
      })
  );
  return (
    <RepositoryContext.Provider value={repo}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </RepositoryContext.Provider>
  );
}

export function useRepository(): SchichtRepository {
  const r = useContext(RepositoryContext);
  if (!r)
    throw new Error(
      "useRepository muss innerhalb von RepositoryProvider verwendet werden."
    );
  return r;
}
