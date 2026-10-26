import { LocalStorageSchichtRepository, type SchichtRepository } from "@/lib/storage";

export type DatenQuelle = "local" | "http";

/**
 * Single place that decides which data source the app uses.
 * Selected via VITE_DATA_SOURCE ("local" default). To add a backend API:
 * implement `HttpSchichtRepository implements SchichtRepository` and return it for "http".
 */
export function erstelleRepository(
  quelle: string = import.meta.env.VITE_DATA_SOURCE ?? "local"
): SchichtRepository {
  switch (quelle) {
    case "local":
      return new LocalStorageSchichtRepository(window.localStorage);
    case "http":
      throw new Error(
        "VITE_DATA_SOURCE=http ist noch nicht implementiert (HttpSchichtRepository fehlt)."
      );
    default:
      throw new Error(`Unbekannte Datenquelle VITE_DATA_SOURCE=${quelle}`);
  }
}
