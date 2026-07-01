export class EngiMcpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint?: string
  ) {
    super(message);
    this.name = "EngiMcpError";
  }
}
