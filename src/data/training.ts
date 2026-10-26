import { useCallback, useState } from "react";
import { TrainingsSpeicher, type TrainingsLadeErgebnis } from "@/lib/training/speicher";
import type { TrainingsDaten } from "@/lib/training/schema";

let speicher: TrainingsSpeicher | null = null;
const holeSpeicher = () => (speicher ??= new TrainingsSpeicher(window.localStorage));

/** Training sessions + release settings from localStorage (synchronous, zod-validated). */
export function useTraining() {
  const [stand, setStand] = useState<TrainingsLadeErgebnis>(() => holeSpeicher().laden());
  const aendern = useCallback((fn: (s: TrainingsSpeicher) => TrainingsDaten) => {
    const daten = fn(holeSpeicher());
    setStand({ ok: true, daten });
  }, []);
  return { stand, daten: stand.daten, aendern };
}
