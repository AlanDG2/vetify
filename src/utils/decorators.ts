import { test } from '@playwright/test';

export function step(name: string) {
  return function stepDecorator<T extends (...args: any[]) => any>(originalMethod: T) {
    return async function wrappedStep(this: any, ...args: any[]) {
      return test.step(name, () => originalMethod.apply(this, args));
    };
  };
}
