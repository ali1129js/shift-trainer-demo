import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SchichtRepository } from "@/lib/storage";
import { useRepository } from "./RepositoryProvider";

export const queryKeys = {
  ladeStatus: ["ladeStatus"] as const,
  schichten: ["schichten"] as const,
};

/** Load status of the data source (error banner). Must resolve before lists are read. */
export function useLadeStatus() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.ladeStatus, queryFn: () => repo.laden() });
}

/** All shifts (MVP: small data set, one query; the board derives views from it). */
export function useSchichten() {
  const repo = useRepository();
  const status = useLadeStatus();
  return useQuery({
    queryKey: queryKeys.schichten,
    queryFn: () => repo.liste(),
    enabled: status.isSuccess,
  });
}

/** Generic write: runs a repository call and refreshes the shift list. */
export function useAktion<A = void, R = unknown>(
  fn: (repo: SchichtRepository, arg: A) => Promise<R>
) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arg: A) => fn(repo, arg),
    onSettled: () => qc.invalidateQueries(),
  });
}
