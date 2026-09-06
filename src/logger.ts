export type LogSink = (text: string) => void | Promise<void>;

export interface LoggerOptions {
  sink?: LogSink;
  clock?: () => Date;
}

export interface Logger {
  log(scope: string, message: string): Promise<void>;
  scoped(scope: string): (message: string) => Promise<void>;
}

export function formatLine(now: Date, scope: string, message: string): string {
  return `${now.toTimeString().slice(0, 8)}  ${scope}  ${message}\n`;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const sink = options.sink ?? ((text: string) => {
    process.stdout.write(text);
  });
  const clock = options.clock ?? (() => new Date());
  let tail: Promise<void> = Promise.resolve();

  const log = (scope: string, message: string): Promise<void> => {
    const lines = message.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    const text = lines.map((line) => formatLine(clock(), scope, line)).join("");

    // Keep a failed write from poisoning later logs or becoming unhandled.
    const next = tail.then(() => sink(text)).catch(() => {});
    tail = next;
    return next;
  };

  return {
    log,
    scoped: (scope) => (message) => log(scope, message),
  };
}
