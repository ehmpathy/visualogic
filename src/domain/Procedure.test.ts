import { given, then } from 'test-fns';

import { Procedure, ProcedureInput } from './Procedure';

describe('Procedure', () => {
  given('a simple procedure', () => {
    const doIt: Procedure<{ reason: string }, void, { done: true }> = (input: {
      reason: string;
    }) => {
      return { done: true };
    };
    then('it should have no issues extracting the types', () => {
      // @ts-expect-error: 'reason' is declared but its value is never read.ts(6133)
      const reason: ProcedureInput<typeof doIt>['reason'] = 821;
    });
  });
});
