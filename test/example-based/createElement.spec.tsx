import { b } from '../../src';

test('throws error on invalid element', () => {
  let errors = 0;
  try {
    let arr: any[] = [];
    b(arr as any, null);
  } catch {
    errors++;
  }
  expect(errors).toBe(1);
});
