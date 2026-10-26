/** In-memory Storage for tests. */
export class TestSpeicher implements Storage {
  private m = new Map<string, string>();
  vollAb: number | null = null;
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    if (this.vollAb !== null && v.length > this.vollAb)
      throw new Error("QuotaExceededError");
    this.m.set(k, v);
  }
}
