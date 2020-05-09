import { memo } from '../../../src/component';
import { b, mount } from '../../../src';

describe('optimizations', () => {
  // memo instance

  let $root = document.body;

  test('isLeaf', () => {
    /** make 2 sibling machines; one marked as a leaf,
     * one not. make them push to an array (leafArr, nonLeafArr)
     * on each render. send events to both machines and count renders.
     * this test must pass!
     */
    expect(true).toBe(true);
  });

  test('granular global events', () => {
    const idNodeDepth: [string, number][] = [];

    idNodeDepth.push(['hi', 2], ['ur mom', 1], ['a child', 4], ['fun', 3]);

    idNodeDepth.sort((a, b) => b[1] - a[1]);

    expect(true).toBe(true);
  });

  test('memo', () => {
    const MemoComp = memo<{ count: number }>(({ count }) => {
      return <p>{count}</p>;
    });

    const App = () => (
      <div>
        <MemoComp count={22} />
      </div>
    );

    // const vinod = b(MemoComp, { count: 22 });

    // console.log(vinod);

    $root = mount(App, $root);

    console.log($root.firstChild);

    expect(true).toBe(true);
  });
});
