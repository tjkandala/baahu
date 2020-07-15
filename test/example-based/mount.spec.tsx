import { b, mount, emit, SFC } from '../../src';
import { machine } from '../../src/component';
// import { machineRegistry } from '../../src/machineRegistry';

describe('machine mounting', () => {
  test("mount events don't cause infinite loop", () => {
    /**
     * regression test:
     * this used to cause "RangeError: Maximum call stack size exceeded"
     */
    const Mach = machine<any>({
      id: 'test',
      context: () => ({
        name: 'anon',
      }),
      initial: 'default',
      mount: () => {
        emit({ type: 'SET_NAME', name: 'ymous' }, 'test');
      },
      when: {
        default: {
          on: {
            SET_NAME: {
              do: (ctx, e) => (ctx.name = e.name),
            },
          },
        },
      },
      render: (_, ctx) => <p>{ctx.name}</p>,
    });

    mount(Mach, document.body);

    expect(document.body.firstChild?.firstChild?.nodeValue).toBe('ymous');
  });
});

describe('app mounting', () => {
  const TestMach = machine({
    id: 'testRoot',
    context: () => ({}),
    initial: 'ready',
    when: {
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

  const Foo = machine<{ num: number }>({
    id: ({ num }) => `foo-${num}`,
    context: () => ({}),
    initial: 'sleeping',
    when: {
      sleeping: {
        on: {
          WAKE_UP: {
            to: 'awake',
          },
        },
      },
      awake: {},
    },
    render: (s, _ctx) => <p>{s}</p>,
  });

  // this works with AND without keys!
  test("doesn't unmount nested machines bc of conditional rendering (right)", () => {
    const AppMachine = machine<{}>({
      id: 'app',
      context: () => ({}),
      initial: 'even',
      when: {
        even: {
          on: {
            TOGGLE: {
              to: 'odd',
            },
          },
        },
        odd: {
          on: {
            TOGGLE: {
              to: 'even',
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

  // this works with keys, but not without keys! (works now)
  test("doesn't unmount nested machines bc of conditional rendering (left)", () => {
    const AppMachine = machine<{}>({
      id: 'app',
      context: () => ({}),
      initial: 'even',
      when: {
        even: {
          on: {
            TOGGLE: {
              to: 'odd',
            },
          },
        },
        odd: {
          on: {
            TOGGLE: {
              to: 'even',
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
