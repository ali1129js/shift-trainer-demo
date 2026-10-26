/** Business rule violated (locked task, closed shift, missing permission …). */
export class WorkflowFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowFehler";
  }
}

/** Storage not readable/writable. */
export class SpeicherFehler extends Error {
  constructor(
    message: string,
    readonly ursache?: unknown
  ) {
    super(message);
    this.name = "SpeicherFehler";
  }
}
