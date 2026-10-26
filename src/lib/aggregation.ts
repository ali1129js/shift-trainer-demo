/**
 * Reserved structure for the Aggregation topic. Content follows later (to be
 * confirmed with Ali); intentionally empty for now.
 */
export interface AggregationAbschnitt {
  id: string;
  titel: string;
  punkte: readonly string[];
  /** Optional nested subsections. */
  unterabschnitte?: readonly AggregationAbschnitt[];
  /** Open point still to be confirmed. */
  offen?: string;
}

export interface AggregationInhalt {
  abschnitte: readonly AggregationAbschnitt[];
}

export const AGGREGATION_INHALT: AggregationInhalt = { abschnitte: [] };

export const hatInhalt = (i: AggregationInhalt = AGGREGATION_INHALT) =>
  i.abschnitte.length > 0;
