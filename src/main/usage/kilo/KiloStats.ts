/** What `kilo stats --models` reports for a window of days. */
export interface KiloStats {
  tokens: number;
  cost: number;
  /** Models Kilo replied with, most used first. */
  models: { id: string; replies: number }[];
}
