import type { LogMethods } from 'simple-leveled-log-methods';

export interface VisualogicContext {
  log: LogMethods & { _orig?: LogMethods }; // todo: support ".scope" as a first class attribute of log methods to avoid having to track original log object
}
