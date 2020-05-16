import { memo } from '../../../src/component';
import { b, mount, machine, VNode, emit } from '../../../src';
import { machineRegistry } from '../../../src/machineRegistry';
import { shouldRender } from '../../../src/diff/index';
import { ElementVNode } from '../../../src/createElement';

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

  test('shouldRender', () => {
    expect(shouldRender({ count: 10 }, { count: 11 })).toBe(true);

    expect(shouldRender({ count: 10 }, { count: 10 })).toBe(false);

    const anObjProp = { name: 'TJ' };

    // same object reference
    expect(
      shouldRender(
        { count: 10, objProp: anObjProp },
        { count: 10, objProp: anObjProp }
      )
    ).toBe(false);

    expect(
      shouldRender(
        { count: 10, objProp: anObjProp },
        { count: 11, objProp: anObjProp }
      )
    ).toBe(true);

    // new objects. this should be true bc only checking for shallow eq
    expect(
      shouldRender(
        { count: 10, objProp: { name: 'TJ' } },
        { count: 10, objProp: { name: 'TJ' } }
      )
    ).toBe(true);
  });

  test('memo basic', () => {
    const MemoComp = memo<{ count: number }>(({ count }) => {
      renders++;
      return <p>{count}</p>;
    });

    const Mach = machine<{}>({
      id: 'mach',
      initial: 'default',
      context: () => ({
        first: 10,
        second: 22,
      }),
      when: {
        default: {
          on: {
            INC_FIRST: {
              do: ctx => (ctx.first = ctx.first + 1),
            },
          },
        },
      },
      render: (_s, ctx) => (
        <div>
          <MemoComp count={ctx.first} />
          <MemoComp count={ctx.second} />
        </div>
      ),
    });

    /** TODO: count renders */
    let renders = 0;

    $root = mount(Mach, $root);

    const inst = machineRegistry.get('mach');

    const rootMachineVNode = inst?.v;

    const divVChildrenBefore = rootMachineVNode?.c?.c as VNode[];

    const firstVChildBefore = divVChildrenBefore[0].c as ElementVNode;
    const secondVChildBefore = divVChildrenBefore[1].c as ElementVNode;

    expect(renders).toBe(2);

    expect(inst?.x['first']).toBe(10);

    expect($root.firstChild?.firstChild?.nodeValue).toBe('10');

    expect($root.childNodes[1]?.firstChild?.nodeValue).toBe('22');

    const vkids = rootMachineVNode?.c?.c as VNode[];
    expect(vkids.length).toBe(2);

    emit({ type: 'INC_FIRST' });

    // this should be three bc props of first memo changed, second didn't
    expect(renders).toBe(3);

    // check that first vnode is not equal (before + after), while second vnode is!

    const divVChildrenAfter = rootMachineVNode?.c?.c as VNode[];

    const firstVChildAfter = divVChildrenAfter[0].c as ElementVNode;
    const secondVChildAfter = divVChildrenAfter[1].c as ElementVNode;

    expect(firstVChildBefore === firstVChildAfter).toBe(false);

    expect(secondVChildBefore === secondVChildAfter).toBe(true);

    expect(inst?.x['first']).toBe(11);

    expect($root.firstChild?.firstChild?.nodeValue).toBe('11');

    expect($root.childNodes[1]?.firstChild?.nodeValue).toBe('22');

    expect(true).toBe(true);
  });
});
