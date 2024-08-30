import { LogMethods } from 'simple-leveled-log-methods';

import { withLogTrail } from './withLogTrail';

const logDebugSpy = jest.spyOn(console, 'debug');

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('withLogTrail', () => {
  beforeEach(() => jest.clearAllMocks());
  describe('input output logs', () => {
    it('should be log input and output for a sync fn', () => {
      const castToUpperCase = withLogTrail(
        ({ name }: { name: string }) => {
          return name.toUpperCase();
        },
        { name: 'castToUpperCase' },
      );

      // should run like normal
      const uppered = castToUpperCase({ name: 'casey' }, { log: console });
      expect(uppered).toEqual('CASEY');

      // should have logged input and output
      expect(logDebugSpy).toHaveBeenCalledTimes(2);
      expect(logDebugSpy).toHaveBeenNthCalledWith(1, 'castToUpperCase.input', {
        input: { name: 'casey' },
      });
      expect(logDebugSpy).toHaveBeenNthCalledWith(2, 'castToUpperCase.output', {
        input: { name: 'casey' },
        output: ['CASEY'],
      });
    });
    it('should be log input and output for an async fn', async () => {
      const castToUpperCase = withLogTrail(
        async ({ name }: { name: string }) => {
          await sleep(100);
          return name.toUpperCase();
        },
        { name: 'castToUpperCase' },
      );

      // should run like normal
      const uppered = await castToUpperCase(
        { name: 'casey' },
        { log: console },
      );
      expect(uppered).toEqual('CASEY');

      // should have logged input and output
      expect(logDebugSpy).toHaveBeenCalledTimes(2);
      expect(logDebugSpy).toHaveBeenNthCalledWith(1, 'castToUpperCase.input', {
        input: { name: 'casey' },
      });
      expect(logDebugSpy).toHaveBeenNthCalledWith(2, 'castToUpperCase.output', {
        input: { name: 'casey' },
        output: ['CASEY'],
      });
    });
    it('should be log input and output for a generic fn', async () => {
      const castToUpperCase = withLogTrail(
        async <R extends { name: string }>(input: { row: R }) => {
          await sleep(100);
          return input.row.name.toUpperCase();
        },
        { name: 'castToUpperCase' },
      );

      // should run like normal
      const uppered = await castToUpperCase<{ name: string; exid: string }>(
        { row: { name: 'casey', exid: 'bae' } },
        { log: console },
      );
      expect(uppered).toEqual('CASEY');

      // should have logged input and output
      expect(logDebugSpy).toHaveBeenCalledTimes(2);
      expect(logDebugSpy).toHaveBeenNthCalledWith(1, 'castToUpperCase.input', {
        input: { row: { exid: 'bae', name: 'casey' } },
      });
      expect(logDebugSpy).toHaveBeenNthCalledWith(2, 'castToUpperCase.output', {
        input: { row: { exid: 'bae', name: 'casey' } },
        output: ['CASEY'],
      });
    });
  });
  describe('duration reporting', () => {
    it('should report the duration of an operation if it takes more than 1 second by default', async () => {
      const castToUpperCase = withLogTrail(
        async ({ name }: { name: string }) => {
          await sleep(1100);
          return name.toUpperCase();
        },
        { name: 'castToUpperCase' },
      );

      // should run like normal
      const uppered = await castToUpperCase(
        { name: 'casey' },
        { log: console },
      );
      expect(uppered).toEqual('CASEY');

      // should have logged input and output
      expect(logDebugSpy).toHaveBeenCalledTimes(3);
      expect(logDebugSpy).toHaveBeenNthCalledWith(1, 'castToUpperCase.input', {
        input: { name: 'casey' },
      });
      expect(logDebugSpy).toHaveBeenNthCalledWith(
        2,
        'castToUpperCase.duration.breach',
        {
          input: { name: 'casey' },
          already: { duration: '1 sec' },
        },
      );
      expect(logDebugSpy).toHaveBeenNthCalledWith(3, 'castToUpperCase.output', {
        input: { name: 'casey' },
        output: ['CASEY'],
        duration: expect.stringContaining(' sec'),
      });
    });
  });
  describe('log context', () => {
    it('should be possible to log from the context', () => {
      const castToUpperCase = withLogTrail(
        ({ name }: { name: string }, context) => {
          context.log.debug('begin uppercasement', { on: name });
          return name.toUpperCase();
        },
        { name: 'castToUpperCase' },
      );

      // should run like normal
      const uppered = castToUpperCase({ name: 'casey' }, { log: console });
      expect(uppered).toEqual('CASEY');

      // should have logged input and output
      expect(logDebugSpy).toHaveBeenCalledTimes(3);
      expect(logDebugSpy).toHaveBeenNthCalledWith(1, 'castToUpperCase.input', {
        input: { name: 'casey' },
      });
      expect(logDebugSpy).toHaveBeenNthCalledWith(
        2,
        'castToUpperCase.progress: begin uppercasement',
        { on: 'casey' },
      );
      expect(logDebugSpy).toHaveBeenNthCalledWith(3, 'castToUpperCase.output', {
        input: { name: 'casey' },
        output: ['CASEY'],
      });
    });
    it('should add log to prior context', () => {
      const castToUpperCase = withLogTrail(
        (
          { name }: { name: string },
          context: { organization: string; log: LogMethods },
        ) => {
          context.log.debug('begin uppercasement', { on: name });
          return name.toUpperCase();
        },
        { name: 'castToUpperCase' },
      );

      // should run like normal
      const uppered = castToUpperCase(
        { name: 'casey' },
        { organization: 'superorg', log: console },
      );
      expect(uppered).toEqual('CASEY');

      // should have logged input and output
      expect(logDebugSpy).toHaveBeenCalledTimes(3);
      expect(logDebugSpy).toHaveBeenNthCalledWith(1, 'castToUpperCase.input', {
        input: { name: 'casey' },
      });
      expect(logDebugSpy).toHaveBeenNthCalledWith(
        2,
        'castToUpperCase.progress: begin uppercasement',
        { on: 'casey' },
      );
      expect(logDebugSpy).toHaveBeenNthCalledWith(3, 'castToUpperCase.output', {
        input: { name: 'casey' },
        output: ['CASEY'],
      });
    });
  });
});
