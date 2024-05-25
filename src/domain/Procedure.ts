/**
 * what: the shape of an observable procedure
 *
 * what^2:
 * - observable = easy to read, monitor, and maintain
 * - procedure = an executable of a tactic; tactic.how.procedure::Executable
 *
 * note
 * - javascript's "functions" are actually, by definition, procedures
 */
export type Procedure = (
  /**
   * the input of the procedure
   */
  input: any,

  /**
   * the context within which the procedure runs
   */
  context?: any,
) => any;

/**
 * extracts the input::Type of a procedure
 */
export type ProcedureInput<T extends Procedure> = Parameters<T>[0];

/**
 * extracts the context::Type of a procedure
 */
export type ProcedureContext<T extends Procedure> = Parameters<T>[1];

/**
 * extracts the output::Type of a procedure
 */
export type ProcedureOutput<T extends Procedure> = ReturnType<T>;
