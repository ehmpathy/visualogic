import { withLogTrail } from './withLogTrail';

const logDebugSpy = jest.spyOn(console, 'log');

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('withLogTrail', () => {
  beforeEach(() => jest.clearAllMocks());
  describe('input output logging', () => {
    it('should be log input and output for a sync fn', () => {
      const castToUpperCase = withLogTrail(
        ({ name }: { name: string }) => {
          return name.toUpperCase();
        },
        { name: 'castToUpperCase', log: { method: console.log } },
      );

      // should run like normal
      const uppered = castToUpperCase({ name: 'casey' });
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
        { name: 'castToUpperCase', log: { method: console.log } },
      );

      // should run like normal
      const uppered = await castToUpperCase({ name: 'casey' });
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
  });
  describe('duration reporting', () => {
    it('should report the duration of an operation if it takes more than 1 second by default', async () => {
      const castToUpperCase = withLogTrail(
        async ({ name }: { name: string }) => {
          await sleep(1100);
          return name.toUpperCase();
        },
        { name: 'castToUpperCase', log: { method: console.log } },
      );

      // should run like normal
      const uppered = await castToUpperCase({ name: 'casey' });
      expect(uppered).toEqual('CASEY');

      // should have logged input and output
      expect(logDebugSpy).toHaveBeenCalledTimes(2);
      expect(logDebugSpy).toHaveBeenNthCalledWith(1, 'castToUpperCase.input', {
        input: { name: 'casey' },
      });
      expect(logDebugSpy).toHaveBeenNthCalledWith(2, 'castToUpperCase.output', {
        input: { name: 'casey' },
        output: ['CASEY'],
        duration: expect.stringContaining(' sec'),
      });
    });
  });
});
