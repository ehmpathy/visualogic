import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import { LogLevel, LogMethod, LogMethods } from 'simple-leveled-log-methods';
import { isAPromise } from 'type-fns';

import {
  Procedure,
  ProcedureContext,
  ProcedureInput,
  ProcedureOutput,
} from '../domain/Procedure';

const noOp = (...input: any) => input;
const omitContext = (...input: any) => input[0]; // standard pattern for args = [input, context]
const pickErrorMessage = (input: Error) => ({
  error: { message: input.message },
});
const roundToHundredths = (num: number) => Math.round(num * 100) / 100; // https://stackoverflow.com/a/14968691/3068233

/**
 * enables input output logging and tracing for a method
 *
 * todo: - add tracing identifier w/ async-context
 * todo: - hookup visual tracing w/ external lib (vi...lo...)
 * todo: - bundle this with its own logging library which supports scoped logs
 */
export const withLogTrail = <
  TInput,
  TContext extends { log: LogMethods },
  TOutput,
>(
  logic: (input: TInput, context: TContext) => TOutput,
  {
    name: declaredName,
    durationReportingThresholdInSeconds = 1,
    log: logInput,
  }: {
    /**
     * specifies the name of the function, if the function does not have a name assigned already
     */
    name?: string;

    /**
     * enable redacting parts of the input or output from logging
     */
    log:
      | LogMethods
      | {
          /**
           * specifies the log method to use to log with
           */
          methods: LogMethods; // TODO: use a logger which leverages async-context to scope all logs created inside of this fn w/ `${name}.progress: ${message}`; at that point, probably stick "inout output tracing" inside of that lib

          /**
           * specifies the level to log the trail with
           *
           * note:
           * - defaults to .debug // todo: debug to .trail
           */
          level?: LogLevel;

          /**
           * what of the input to log
           */
          input?: (...value: Parameters<typeof logic>) => any;

          /**
           * what of the output to log
           */
          output?: (value: Awaited<ReturnType<typeof logic>>) => any;

          /**
           * what of the error to log
           */
          error?: (error: Error) => any;
        };

    /**
     * specifies the threshold after which a duration will be included on the output log
     */
    durationReportingThresholdInSeconds?: number;
  },
): Procedure<
  ProcedureInput<typeof logic>,
  Omit<ProcedureContext<typeof logic>, 'log'> & { log?: LogMethods },
  ProcedureOutput<typeof logic>
> => {
  // cache the name of the function per wrapping
  const name: string | null = logic.name || declaredName || null; // use `\\` since `logic.name` returns `""` for anonymous functions

  // if no name is identifiable, throw an error here to fail fast
  if (!name)
    throw new UnexpectedCodePathError(
      'could not identify name for wrapped function',
    );

  // if the name specified does not match the name of the function, throw an error here to fail fast
  if (declaredName && name !== declaredName)
    throw new UnexpectedCodePathError(
      'the natural name of the function is different than the declared name',
      { declaredName, naturalName: name },
    );

  // extract the log methods
  const logMethods: LogMethods =
    'methods' in logInput ? logInput.methods : logInput;
  const logTrailLevel: LogLevel =
    ('methods' in logInput ? logInput.level : undefined) ?? LogLevel.DEBUG;
  const logInputMethod =
    ('methods' in logInput ? logInput.input : undefined) ?? omitContext;
  const logOutputMethod =
    ('methods' in logInput ? logInput.output : undefined) ?? noOp;
  const logErrorMethod =
    ('methods' in logInput ? logInput.error : undefined) ?? pickErrorMessage;

  // wrap the function
  return (
    input: ProcedureInput<typeof logic>,
    context: Omit<ProcedureContext<typeof logic>, 'log'> & { log?: LogMethods },
  ): ProcedureOutput<typeof logic> => {
    // now log the input
    logMethods.debug(`${name}.input`, {
      input: logInputMethod(input, context),
    });

    // begin tracking duration
    const startTimeInMilliseconds = new Date().getTime();

    // define the context.log method that will be given to the logic
    const logMethodsWithContext: LogMethods = {
      debug: (
        message: Parameters<LogMethod>[0],
        metadata: Parameters<LogMethod>[1],
      ) => logMethods.debug(`${name}.progress: ${message}`, metadata),
      info: (
        message: Parameters<LogMethod>[0],
        metadata: Parameters<LogMethod>[1],
      ) => logMethods.info(`${name}.progress: ${message}`, metadata),
      warn: (
        message: Parameters<LogMethod>[0],
        metadata: Parameters<LogMethod>[1],
      ) => logMethods.warn(`${name}.progress: ${message}`, metadata),
      error: (
        message: Parameters<LogMethod>[0],
        metadata: Parameters<LogMethod>[1],
      ) => logMethods.error(`${name}.progress: ${message}`, metadata),
    };

    // now execute the method
    const result: ProcedureOutput<typeof logic> = logic(input, {
      ...context,
      log: logMethodsWithContext,
    } as TContext);

    // if the result was a promise, log when that method crosses the reporting threshold, to identify which procedures are slow
    if (isAPromise(result)) {
      // define how to log the breach, on breach
      const onDurationBreach = () =>
        logMethods[logTrailLevel](`${name}.duration.breach`, {
          input: logInputMethod(input, context),
          already: { duration: `${durationReportingThresholdInSeconds} sec` },
        });

      // define a timeout which will trigger on duration threshold
      const onBreachTrigger = setTimeout(
        onDurationBreach,
        durationReportingThresholdInSeconds * 1000,
      );

      // remove the timeout when the operation completes, to prevent logging if completes before duration
      void result
        .finally(() => clearTimeout(onBreachTrigger))
        .catch(() => {
          // do nothing when there's an error; just catch it, to ensure it doesn't get propagated further as an uncaught exception
        });
    }

    // define what to do when we have output
    const logOutput = (output: Awaited<ProcedureOutput<typeof logic>>) => {
      const endTimeInMilliseconds = new Date().getTime();
      const durationInMilliseconds =
        endTimeInMilliseconds - startTimeInMilliseconds;
      const durationInSeconds = roundToHundredths(durationInMilliseconds / 1e3); // https://stackoverflow.com/a/53970656/3068233
      logMethods[logTrailLevel](`${name}.output`, {
        input: logInputMethod(input, context),
        output: logOutputMethod(output),
        ...(durationInSeconds >= durationReportingThresholdInSeconds
          ? { duration: `${durationInSeconds} sec` } // only include the duration if the threshold was crossed
          : {}),
      });
    };

    // define what to do when we have an error
    const logError = (error: Error) => {
      const endTimeInMilliseconds = new Date().getTime();
      const durationInMilliseconds =
        endTimeInMilliseconds - startTimeInMilliseconds;
      const durationInSeconds = roundToHundredths(durationInMilliseconds / 1e3); // https://stackoverflow.com/a/53970656/3068233
      logMethods[logTrailLevel](`${name}.error`, {
        input: logInputMethod(input, context),
        output: logErrorMethod(error),
        ...(durationInSeconds >= durationReportingThresholdInSeconds
          ? { duration: `${durationInSeconds} sec` } // only include the duration if the threshold was crossed
          : {}),
      });
    };

    // if result is a promise, ensure we log after the output resolves
    if (isAPromise(result))
      return result
        .then((output: Awaited<ProcedureOutput<typeof logic>>) => {
          logOutput(output);
          return output;
        })
        .catch((error: Error) => {
          logError(error);
          throw error;
        }) as TOutput;

    // otherwise, its not a promise, so its done, so log now and return the result
    logOutput(result as Awaited<ProcedureOutput<typeof logic>>);
    return result;
  };
};
