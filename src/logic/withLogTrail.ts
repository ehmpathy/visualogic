import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import type { LogMethod } from 'simple-leveled-log-methods';
import { isAPromise } from 'type-fns';

const noOp = (...input: any) => input;
const omitContext = (...input: any) => input[0]; // standard pattern for args = [input, context]
const roundToHundredths = (num: number) => Math.round(num * 100) / 100; // https://stackoverflow.com/a/14968691/3068233

/**
 * enables input output logging and tracing for a method
 *
 * todo: - add tracing identifier w/ async-context
 * todo: - hookup visual tracing w/ external lib (vi...lo...)
 * todo: - bundle this with its own logging library which supports scoped logs
 */
export const withLogTrail = <T extends (...args: any[]) => any>(
  logic: T,
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
      | LogMethod
      | {
          /**
           * specifies the log method to use to log with
           */
          method: LogMethod; // TODO: use a logger which leverages async-context to scope all logs created inside of this fn w/ `${name}.progress: ${message}`; at that point, probably stick "inout output tracing" inside of that lib

          /**
           * what of the input to log
           */
          input?: (...value: Parameters<T>) => any;

          /**
           * what of the output to log
           */
          output?: (value: Awaited<ReturnType<T>>) => any;
        };

    /**
     * specifies the threshold after which a duration will be included on the output log
     */
    durationReportingThresholdInSeconds?: number;
  },
) => {
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
  const logMethod: LogMethod =
    'method' in logInput ? logInput.method : logInput;
  const logInputMethod =
    ('input' in logInput ? logInput.input : undefined) ?? omitContext;
  const logOutputMethod =
    ('output' in logInput ? logInput.output : undefined) ?? noOp;

  // wrap the function
  return ((...input: any): any => {
    // now log the input
    logMethod(`${name}.input`, { input: logInputMethod(...input) });

    // begin tracking duration
    const startTimeInMilliseconds = new Date().getTime();

    // now execute the method
    const result = logic(...input);

    // if the result was a promise, log when that method crosses the reporting threshold, to identify which procedures are slow
    if (isAPromise(result)) {
      // define how to log the breach, on breach
      const onDurationBreach = () =>
        logMethod(
          `${name}.duration.breach: procedure has taken longer than duration report threshold`,
          {
            input: logInputMethod(...input),
            already: { duration: `${durationReportingThresholdInSeconds} sec` },
          },
        );

      // define a timeout which will trigger on duration threshold
      const onBreachTrigger = setTimeout(
        onDurationBreach,
        durationReportingThresholdInSeconds,
      );

      // remove the timeout when the operation completes, to prevent logging if completes before duration
      void result.finally(() => clearTimeout(onBreachTrigger));
    }

    // define what to do when we have output
    const logOutput = (output: Awaited<ReturnType<T>>) => {
      const endTimeInMilliseconds = new Date().getTime();
      const durationInMilliseconds =
        endTimeInMilliseconds - startTimeInMilliseconds;
      const durationInSeconds = roundToHundredths(durationInMilliseconds / 1e3); // https://stackoverflow.com/a/53970656/3068233
      logMethod(`${name}.output`, {
        input: logInputMethod(...input),
        output: logOutputMethod(output),
        ...(durationInSeconds >= durationReportingThresholdInSeconds
          ? { duration: `${durationInSeconds} sec` } // only include the duration if the threshold was crossed
          : {}),
      });
    };

    // if result is a promise, ensure we log after the output resolves
    if (isAPromise(result))
      return result.then((output) => {
        logOutput(output);
        return output;
      });

    // otherwise, its not a promise, so its done, so log now and return the result
    logOutput(result);
    return result;
  }) as T;
};
