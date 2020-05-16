import {
  SFC,
  b,
  emit,
  machine,
  createRouter,
  RouterSchema,
  mount,
  linkTo,
} from '../../src';
import * as fc from 'fast-check';
import {
  machineRegistry,
  machinesThatTransitioned,
} from '../../src/machineRegistry';
import { VNode } from '../../src/createElement';
import { markLIS } from '../../src/diff';

/**
 * Think of properties to test:
 *
 * - number of machines in the machine registry is equal to number
 * of machine instances rendered in the vdom
 *
 * - use "document.isSameNode" for keyed diff!
 */

describe('machine property-based tests', () => {
  let $root = document.body;

  /**
   * brainstorming properties to test
   *
   * - the state at any given time must be in the when array (use randomly generated when arrays to generate machine schemas!)
   * - the machine must not be in "machinesThatTransitioned" if the event that was emitted is not in the events array
   *    (again, use randomly generated events arrays to generate machine schemas!)
   * - the machine must be in "machinesThatTransitioned"
   *
   * after passing these core machine property tests, test properties of multiple machines on same page, leaves, etc.
   * this might be taken care of in app property tests!
   */
  test('machine property 1', () => {
    /**
     * for any two sets of strings a (length n) and b (length k, k >= n),
     * where a is the set of when and b is the set of events,
     * and a[0] is the initial state, and each state[i] transitions to the
     * next state[i + 1] on event[i], the state after emitting
     * event[0] through event[k - 1] will be state[n - 1] (final state).
     *
     * emitting the excess events shouldn't affect state.
     *
     * this state is visible in the dom through the render function.
     * */
    fc.assert(
      fc.property(
        fc.set(fc.string(2, 10), 3, 10),
        fc.set(fc.string(2, 10), 10, 10),
        (when, events) => {
          const whenSchema: {
            [state: string]: {
              on: {
                [event: string]: {
                  to: string;
                };
              };
            };
          } = {};

          for (let i = 0; i < when.length; i++) {
            const state = when[i];
            // no transition for the last state
            if (i < when.length - 1) {
              const nextState = when[i + 1];

              const thisWhenSchema = {
                on: {
                  [events[i]]: {
                    to: nextState,
                  },
                },
              };

              whenSchema[state] = thisWhenSchema;
            } else {
              whenSchema[state] = { on: {} };
            }
          }

          const Mach = machine({
            id: 'Mach',
            initial: when[0],
            context: () => ({}),
            when: whenSchema,
            render: s => <p>{s}</p>,
          });

          $root = mount(Mach, $root);

          // is initial state (when[0])
          expect($root.nodeName).toBe('P');
          expect($root.firstChild?.nodeValue).toBe(when[0]);

          // emit all events
          for (const eventType of events) {
            emit({ type: eventType });
          }

          // is final state (when[n - 1])
          expect($root.nodeName).toBe('P');
          expect($root.firstChild?.nodeValue).toBe(when[when.length - 1]);

          // have to clear bc its the same app instance
          machineRegistry.clear();
          machinesThatTransitioned.clear();
        }
      )
    );
  });

  test('machine property 2', () => {
    /**
     * for n machines rendered, there should be n instances in the machine registry.
     */

    fc.assert(
      fc.property(fc.integer(0, 50), n => {
        const App = () => (
          <div>
            {Array.from({ length: n }).map((_, i) => (
              <Machine i={i} />
            ))}
          </div>
        );

        const Machine = machine<{ i: number }>({
          id: props => `${props.i}`,
          initial: 'exists',
          context: () => ({}),
          when: {
            exists: {},
          },
          render: (_, _ctx, self) => <p>{self}</p>,
        });

        $root = mount(App, $root);

        expect(machineRegistry.size).toBe(n);

        machineRegistry.clear();
      })
    );
  });

  test('machine property 3', () => {
    /**
     *
     * where t = n + k, t machines are rendered, and n machines transition,
     * there should be n machines in 'machinesThatTransitioned.'
     *
     * k machines in the machine registry should have the property of oldVNode === newVNode
     * (all the machines of the type that didn't transition should have the property of oldVNode -== newVNode)
     */

    fc.assert(
      fc.property(fc.integer(0, 50), fc.integer(0, 50), (numOne, numTwo) => {
        const MachThatTransitions = machine<{ i: number }>({
          id: props => `transitions-${props.i}`,
          initial: 'loading',
          context: () => ({}),
          when: {
            loading: {
              on: {
                LOADED: {
                  to: 'ready',
                },
              },
            },
            ready: {},
          },
          render: () => <p>i transition</p>,
        });

        const MachThatDoesntTransition = machine<{ i: number }>({
          id: props => `doesnottransition-${props.i}`,
          initial: 'loading',
          context: () => ({}),
          when: {
            loading: {},
          },
          render: () => <p>i don't transition</p>,
        });

        const App: SFC = () => (
          <div>
            <div>
              {Array.from({ length: numOne }).map((_, i) => (
                <MachThatTransitions i={i} />
              ))}
            </div>
            {Array.from({ length: numTwo }).map((_, i) => (
              <MachThatDoesntTransition i={i} />
            ))}
          </div>
        );

        $root = mount(App, $root);

        expect(machineRegistry.size).toBe(numOne + numTwo);

        const oldVNodes = new Map<string, VNode | null>();

        machineRegistry.forEach(machine => {
          oldVNodes.set(machine.id, machine.v.c);
        });

        emit({ type: 'LOADED' });

        const newVNodes = new Map<string, VNode | null>();

        machineRegistry.forEach(machine => {
          newVNodes.set(machine.id, machine.v.c);
        });

        // don't really have to count both but why not
        let persistedNodes = 0;
        let rerenderedNodes = 0;

        for (const [id, newVNode] of newVNodes) {
          const oldVNode = oldVNodes.get(id);
          if (oldVNode) {
            if (oldVNode === newVNode) {
              persistedNodes++;
              expect(id.slice(0, 7) === 'doesnot').toBe(true);
            } else {
              rerenderedNodes++;
              expect(id.slice(0, 1) === 't').toBe(true);
            }
          }
        }

        expect(rerenderedNodes).toBe(numOne);
        expect(persistedNodes).toBe(numTwo);

        machineRegistry.clear();
      })
    );

    expect(true).toBe(true);
  });

  test('machine property 4', () => {
    /**
     * routers + machines
     *
     * (input of string array to id the machine + route)
     * for n routes and n machines, 1 machine for each route, only that instance
     * should be on the page for any given route.
     *
     */

    fc.assert(
      fc.property(fc.set(fc.webSegment(), 5, 10), names => {
        // nothing that starts with '*' or ':,
        // those are special cases for RouTrie. '.' doesn't work either for some reason
        const validNames = names.filter(
          name =>
            name.length > 0 &&
            name[0] !== '.' &&
            name[0] !== '*' &&
            name[0] !== ':'
        );

        const routeSchema: RouterSchema = {
          '/': () => <p>home</p>,
        };

        for (let i = 0; i < validNames.length; i++) {
          routeSchema[`/page/${validNames[i]}`] = () => (
            <div>
              <PageMachine routeName={validNames[i]} />
            </div>
          );
        }

        const PageMachine = machine<{ routeName: string }>({
          id: ({ routeName }) => routeName,
          initial: 'here',
          context: () => ({}),
          when: { here: {} },
          render: (_s, _c, self) => <p>{self}</p>,
        });

        const MyRouter = createRouter(routeSchema);

        const App: SFC = () => (
          <div>
            <MyRouter />
          </div>
        );

        $root = mount(App, $root);

        expect($root.nodeName).toBe('DIV');

        for (let i = 0; i < validNames.length; i++) {
          linkTo(`/page/${validNames[i]}`);
          expect($root.firstChild?.nodeName).toBe('DIV');
          expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe(
            validNames[i]
          );

          expect(machineRegistry.get(validNames[i])).toBeDefined();
          expect(machineRegistry.size).toBe(1);
        }

        machineRegistry.clear();
      })
    );

    expect(true).toBe(true);
  });

  test('dom count', () => {
    const length = 10;

    const MyApp: SFC = () => (
      <div id="root">
        {Array.from({ length }).map((_, i) => (
          <p>paragraph {i}</p>
        ))}
      </div>
    );

    $root = mount(MyApp, $root);

    const numOfKids = document.getElementById('root')?.childNodes.length;

    expect(numOfKids).toBe(length);
  });
});

/**
 * properties for LIS:
 *
 * - with input array of unique integers >= 0:
 *
 * - length of before and after must be equal
 * - no negative numbers (other than -1/-2), and number >=0 must be unique
 */
test('markLIS property', () => {
  fc.assert(
    fc.property(fc.set(fc.integer(0, 3000), 2, 100), arr => {
      const lisMarked = markLIS(Int32Array.from(arr));
      expect(lisMarked.length).toBe(arr.length);

      let smallest = -2;

      // 0+. represents moves (position in old array)
      let nonNegative = [];

      for (let i = 0; i < lisMarked.length; i++) {
        lisMarked[i] < smallest && (smallest = lisMarked[i]);
        lisMarked[i] >= 0 && nonNegative.push(lisMarked[i]);
      }

      const nonNegativeSet = [...new Set(nonNegative)];

      expect(smallest >= -2).toBe(true);
      expect(nonNegative).toStrictEqual(nonNegativeSet);
    })
  );
});
