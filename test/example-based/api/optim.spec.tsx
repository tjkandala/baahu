import { memo } from '../../../src/component';
import {
  b,
  mount,
  machine,
  VNode,
  emit,
  lazy,
  SFC,
  MachineComponent,
} from '../../../src';
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

  test('global events, render parents before children', () => {
    /**
     *    ~ROOT~
     *     / \
     *    A   B
     *   / \ / \
     *  C  D E  F
     *
     * Make an event that A, B, C, and F listen to.
     * A shouldn't render C after this event.
     *
     * To ensure that the Baahu logic works, count machine
     * renders (should be 3 machines), and make sure the DOM looks
     * how it is expected to look!
     *
     * Will need to make four machines for this:
     * -A machine
     * -B machine
     * - C & F machine
     * - D & E machine
     *
     * 6 initial renders, 3 rerenders, so 9 total is target
     */

    let renders = 0;

    const AMach = machine<{}>({
      id: 'a',
      initial: 'even',
      context: () => ({}),
      when: {
        even: {},
        odd: {},
      },
      render: () => {
        renders++;

        return <div>hi</div>;
      },
    });

    // const BMach = machine<{}>({
    //   id: 'b',
    //   initial: 'default',
    //   context: () => ({}),
    //   when: {
    //     default: {},
    //   },
    //   render: () => {
    //     renders++;

    //     return <div>hi</div>;
    //   },
    // });
    mount(AMach, $root);
    console.log(renders);
    expect(true).toBe(true);
  });

  const Comp = () => (
    <div>
      <p>me lazy</p>
    </div>
  );

  test('lazy', () => {
    async function mockDynamicImport<Props>(
      comp: SFC<Props> | MachineComponent<Props>
    ) {
      return {
        default: comp,
      };
    }

    const LazyComp = lazy(() => mockDynamicImport(Comp), null);

    let myRoot = mount(LazyComp, $root);

    // will be wrapped in div before and after!

    // before replacement
    expect(myRoot.nodeName).toBe('DIV');
    expect(myRoot.firstChild?.nodeName).toBe(undefined);

    // after replacement (loaded promise)
    return new Promise(res => {
      setTimeout(() => res(true), 0);
    }).then(() => {
      expect(myRoot.nodeName).toBe('DIV');
      expect(myRoot.firstChild?.nodeName).toBe('DIV');
      expect(myRoot.firstChild?.firstChild?.nodeName).toBe('P');

      // render it again

      myRoot = mount(LazyComp, myRoot);
    });
  });

  async function mockDynamicImportError<Props>(
    comp: SFC<Props> | MachineComponent<Props>
  ) {
    throw Error;
    return {
      default: comp,
    };
  }

  test('lazy handles error', () => {
    const LazyComp = lazy(
      () => mockDynamicImportError(Comp),
      null,
      300,
      <p>error</p>
    );

    let myRoot = mount(LazyComp, $root);

    // will be wrapped in div before and after!

    // before replacement
    expect(myRoot.nodeName).toBe('DIV');
    expect(myRoot.firstChild?.nodeName).toBe(undefined);

    // after replacement (error)
    return new Promise(res => {
      setTimeout(() => res(true), 0);
    }).then(() => {
      expect(myRoot.nodeName).toBe('DIV');
      expect(myRoot.firstChild?.nodeName).toBe('P');
      expect(myRoot.firstChild?.firstChild?.nodeValue).toBe('error');
    });
  });

  test('lazy renders fallback', () => {
    async function mockDynamicImportLag<Props>(
      comp: SFC<Props> | MachineComponent<Props>
    ) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        default: comp,
      };
    }

    const LazyComp = lazy(() => mockDynamicImportLag(Comp), <p>fallback</p>, 1);

    let myRoot = mount(LazyComp, $root);

    // will be wrapped in div before and after!

    // before replacement
    expect(myRoot.nodeName).toBe('DIV');
    expect(myRoot.firstChild?.nodeName).toBe(undefined);

    // after replacement (fallback)
    return new Promise(res => {
      setTimeout(() => res(true), 1);
    }).then(() => {
      expect(myRoot.nodeName).toBe('DIV');
      expect(myRoot.firstChild?.nodeName).toBe('P');
      expect(myRoot.firstChild?.firstChild?.nodeValue).toBe('fallback');
    });
  });

  test('lazy renders fallback, then replaces it', () => {
    async function mockDynamicImportLag<Props>(
      comp: SFC<Props> | MachineComponent<Props>
    ) {
      await new Promise(resolve => setTimeout(resolve, 20));
      return {
        default: comp,
      };
    }

    const LazyComp = lazy(
      () => mockDynamicImportLag(Comp),
      <p>fallback</p>,
      10
    );

    let myRoot = mount(LazyComp, $root);

    // will be wrapped in div before and after!

    // before replacement
    expect(myRoot.nodeName).toBe('DIV');
    expect(myRoot.firstChild?.nodeName).toBe(undefined);

    // after replacement (should be component this time)
    return new Promise(res => {
      setTimeout(() => res(true), 30);
    }).then(() => {
      expect(myRoot.nodeName).toBe('DIV');
      expect(myRoot.firstChild?.nodeName).toBe('DIV');
      expect(myRoot.firstChild?.firstChild?.nodeName).toBe('P');
    });
  });

  test('lazy renders fallback, then replaces w/ error', () => {
    async function mockDynamicImportLagError<Props>(
      comp: SFC<Props> | MachineComponent<Props>
    ) {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw Error;
      return {
        default: comp,
      };
    }

    const LazyComp = lazy(
      () => mockDynamicImportLagError(Comp),
      <p>fallback</p>,
      1,
      <p>error</p>
    );

    let myRoot = mount(LazyComp, $root);

    // will be wrapped in div before and after!

    // before replacement
    expect(myRoot.nodeName).toBe('DIV');
    expect(myRoot.firstChild?.nodeName).toBe(undefined);

    // after replacement (should be error this time)
    return new Promise(res => setTimeout(res, 30)).then(() => {
      expect(myRoot.nodeName).toBe('DIV');
      expect(myRoot.firstChild?.nodeName).toBe('P');
      expect(myRoot.firstChild?.firstChild?.nodeValue).toBe('error');
    });
  });
});
