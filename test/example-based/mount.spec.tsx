import { b, mount, emit, SFC } from '../../src';
import { createMachine } from '../../src/component';
// import { machineRegistry } from '../../src/machineRegistry';

describe('mounting', () => {
  const TestMach = createMachine({
    isLeaf: true,
    id: 'testRoot',
    initialContext: () => ({}),
    initialState: 'ready',
    states: {
      ready: {},
    },
    render: () => b('div', {}, b('h1', {}, 'mach test')),
  });

  let $root = document.body;

  test('mount simple machine', () => {
    $root = mount(TestMach, $root) as HTMLElement;

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('H1');
    expect($root.firstChild?.firstChild?.nodeValue).toBe('mach test');
  });

  const TestFun: SFC = () => b('div', {}, b('h3', {}, 'sfc test'));

  test('mount simple function', () => {
    $root = mount(TestFun, $root) as HTMLElement;

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('H3');
    expect($root.firstChild?.firstChild?.nodeValue).toBe('sfc test');
  });

  /**
   * important
   */

  const Foo = createMachine<{ num: number }>({
    id: ({ num }) => `foo-${num}`,
    initialContext: () => ({}),
    initialState: 'sleeping',
    states: {
      sleeping: {
        on: {
          WAKE_UP: {
            target: 'awake',
          },
        },
      },
      awake: {},
    },
    render: (s, _ctx) => <p>{s}</p>,
  });

  // this works with AND without keys!
  test("doesn't unmount nested machines bc of conditional rendering (right)", () => {
    const AppMachine = createMachine<{}>({
      id: 'app',
      initialContext: () => ({}),
      initialState: 'even',
      states: {
        even: {
          on: {
            TOGGLE: {
              target: 'odd',
            },
          },
        },
        odd: {
          on: {
            TOGGLE: {
              target: 'even',
            },
          },
        },
      },
      render: s => {
        switch (s) {
          case 'even':
            return (
              <div>
                <div>
                  <Foo num={1} />
                  <Foo num={2} />
                </div>
                <p>even</p>
              </div>
            );

          case 'odd':
            return (
              <div>
                <div>
                  <Foo num={1} />
                  <Foo num={2} />
                </div>
              </div>
            );
        }
      },
    });

    // brainstorming.. the solution seems to be going from right to left instead? (for unkeyed diff)

    $root = mount(AppMachine, $root);

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('DIV');

    // console.log(machineRegistry.size);

    emit({ type: 'WAKE_UP' });

    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe('awake');

    emit({ type: 'TOGGLE' });

    // console.log(machineRegistry.size);

    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe('awake');

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('DIV');

    expect($root.firstChild?.childNodes?.length).toBe(2);
  });

  /**
   *
   * COMPANION TEST
   *
   */

  // this works with keys, but not without keys!
  test("doesn't unmount nested machines bc of conditional rendering (left)", () => {
    const AppMachine = createMachine<{}>({
      id: 'app',
      initialContext: () => ({}),
      initialState: 'even',
      states: {
        even: {
          on: {
            TOGGLE: {
              target: 'odd',
            },
          },
        },
        odd: {
          on: {
            TOGGLE: {
              target: 'even',
            },
          },
        },
      },
      render: s => {
        return (
          <div>
            {s === 'even' && <p>even</p>}
            <div>
              <Foo num={1} />
              <Foo num={2} />
            </div>
          </div>
        );

        // this version shouldn't work. you should
        // conditionally render with logical operators if most
        // of the view is the same!
        // switch (s) {
        //   case 'even':
        //     return (
        //       <div>
        //         <p>even</p>
        //         <div>
        //           <Foo num={1} />
        //           <Foo num={2} />
        //         </div>
        //       </div>
        //     );

        //   case 'odd':
        //     return (
        //       <div>
        //         <div>
        //           <Foo num={1} />
        //           <Foo num={2} />
        //         </div>
        //       </div>
        //     );
        // }
      },
    });

    $root = mount(AppMachine, $root);

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('P');

    // console.log(machineRegistry.size);

    // machineRegistry.forEach(machine => {
    //   console.log(machine.vNode?.k);
    // });

    emit({ type: 'WAKE_UP' });

    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe(
      'awake'
    );

    emit({ type: 'TOGGLE' });

    // console.log(machineRegistry.size);

    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe(
      'awake'
    );

    expect($root.nodeName).toBe('DIV');
    expect($root.childNodes[1]?.nodeName).toBe('DIV');

    expect($root.childNodes[1]?.childNodes?.length).toBe(2);
  });
});
