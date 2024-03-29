import { machine } from '../../../src/component';
import { b, emit, mount } from '../../../src';

describe("mount events stale tree", () => {
  // TODO: better names, finish test!
  /**
   * bug: 
   * Old VTree
   *      P
   *     /
   *    C1
   * 
   * New VTree
   *      P
   *    /  \
   *   C1   C2
   * 
   * After render and diff, Baahu used to call mount hooks, THEN replaced the machines VTree.
   * This lead to problems on mount hooks that emitted events on the same machine: Baahu still
   * diffed against the old VTree, so it created an extra DOM node for C2
   */
  // test("mount events don't create extra dom nodes", () => {
  //   type Data = {key: string, text: string}
  //   const oldData: Data[] = [{key: "c1", text: "first"}]
  //   const newData: Data[] = [{key: "c1", text: "first"}, {key: "c2", text: "second"}]

  //   const Root = machine<any>({
  //     id: "root",
  //     context: () => ({}),
  //     initial: "no",
  //   })

  //   const Mounter = machine<any>({
  //     id: "mounter",
  //     context: () => ({}),
  //     initial: "old",
  //     when: {
  //       old: {
  //         on : {
  //           TOGGLE: {
  //             to: "new"
  //           }
  //         }
  //       },
  //        new: {
  //          on: {
  //            TOGGLE: {
  //              to: "old"
  //            }
  //          }
  //        }
  //     },
  //     render:(state) => {
      
  //       const vnodes: VNode[] = state === "old" ? oldData.map(datum => <p key={datum.key}>{datum.text}</p>) : newData.map(datum => <p key={datum.key}>{datum.text}</p>)


  //     return <div>{vnodes}</div>
      

    
  //     }
  //   })

  //   const $root = mount(Mounter, document.body)

  //   expect(true).toBe(true)
  // })
})

describe('real world events', () => {
  type MyState = 'loading' | 'ready' | 'complete';
  type MyEvent = { type: 'FINISHED_LOADING' } | { type: 'PROCESSED_DATA' };

  let $root = document.body;

  test('events that lead to other sync events', () => {
    /** this is not a really a good pattern (why not just do the work in one
     * transition, intermediate state would never be rendered anyways), but
     * I want to test that the framework works in predictable ways */

    function processData(): void {
      // do some work (synchronously), then emit event
      emit({ type: 'PROCESSED_DATA' });
    }

    const NestedEventMach = machine<{}, MyState, MyEvent>({
      id: 'nestedEventMach',
      context: () => ({}),
      initial: 'loading',
      when: {
        loading: {
          on: {
            FINISHED_LOADING: {
              to: 'ready',
              do: processData,
            },
          },
        },
        ready: {
          // onEntry: processData,
          on: {
            PROCESSED_DATA: {
              to: 'complete',
            },
          },
        },
        complete: {},
      },
      render: state => b('h1', {}, state),
    });

    $root = mount(NestedEventMach, $root) as HTMLElement;

    expect($root.firstChild?.nodeValue).toBe('loading');

    emit({ type: 'FINISHED_LOADING' });

    expect($root.firstChild?.nodeValue).toBe('complete');
  });

  test('async events', () => {
    function processData(): void {
      // do some work (async), then emit event
      new Promise(res => {
        setTimeout(() => res(true), 0);
      }).then(() => emit({ type: 'PROCESSED_DATA' }));
    }

    const NestedEventMach = machine<{}, MyState, MyEvent>({
      id: 'nestedEventMachAsync',
      context: () => ({}),
      initial: 'loading',
      when: {
        loading: {
          on: {
            FINISHED_LOADING: {
              to: 'ready',
            },
          },
        },
        ready: {
          entry: processData,
          on: {
            PROCESSED_DATA: {
              to: 'complete',
            },
          },
        },
        complete: {},
      },
      render: state => b('h1', {}, state),
    });

    $root = mount(NestedEventMach, $root) as HTMLElement;

    expect($root.firstChild?.nodeValue).toBe('loading');

    emit({ type: 'FINISHED_LOADING' });

    expect($root.firstChild?.nodeValue).toBe('ready');

    return new Promise(res => {
      setTimeout(() => res(true), 0);
    }).then(() => expect($root.firstChild?.nodeValue).toBe('complete'));
  });

  test('root on', () => {
    let effectCount = 0;

    const RootOnMach = machine<{}, 'even' | 'odd'>({
      id: 'root',
      initial: 'even',
      context: () => ({}),
      on: {
        TOGGLE: {
          do: [() => effectCount++, () => effectCount++],
          to: 'odd',
        },
        DECREMENT: {
          do: () => effectCount--,
        },
      },
      when: {
        even: {},
        odd: {},
      },
      render: state => <p>{state}</p>,
    });

    $root = mount(RootOnMach, $root);

    expect($root.firstChild?.nodeValue).toBe('even');

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.nodeValue).toBe('odd');
    expect(effectCount).toBe(2);

    emit({ type: 'DECREMENT' });

    expect(effectCount).toBe(1);
  });
});
