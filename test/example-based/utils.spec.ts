import { markLIS } from '../../src/diff';

describe('lis', () => {
  test('mark longest increasing subsequence', () => {
    // -1 and -2 can't work with this function,
    // but that does not matter because the values
    // of the source array represent indices (min 0)
    const sourcesOne = Int32Array.from([6, 3, 8, 1, 12, 10]);

    expect(markLIS(sourcesOne)).toStrictEqual(
      Int32Array.from([6, -2, -2, 1, 12, -2])
    );

    const sourcesTwo = Int32Array.from([5, 7, -24, 12, 10, 2, 3, 12, 5, 6, 35]);

    expect(markLIS(sourcesTwo)).toStrictEqual(
      Int32Array.from([5, 7, -2, 12, 10, -2, -2, 12, -2, -2, -2])
    );
  });
});
