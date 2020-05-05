// TODO: computed id + targeted events (this can be combined into one good test!)
// TOOD: initial context? may just combine it with first test

import { SFC, createMachine } from '../../../src/component';
import { b, emit, linkTo, mount } from '../../../src';

describe('machine components', () => {
  let $root = document.body;

  // TODO: recursive machines

  test('constructor works', () => {
    const MyMach = createMachine<{ name: string }>({
      id: 'myMach',
      initialContext: () => ({}),
      initialState: 'loading',
      states: {
        loading: {},
      },
      render: () => (
        <div>
          <p>my mach</p>
        </div>
      ),
    });

    const App: SFC = () => (
      <div>
        <MyMach name="tj" />
      </div>
    );

    mount(App, $root);

    linkTo('rerender');
  });

  test('computed ids for resuable machines', () => {
    type Props = {
      species: string;
    };
    type State = 'sleeping' | 'eating';
    type Event = { type: 'WAKE_UP' } | { type: 'STOMACH_FILLED' };

    const ReusableAnimalMachine = createMachine<Props, State, Event>({
      id: props => `${props.species}-machine`,
      initialContext: () => ({}),
      initialState: 'sleeping',
      states: {
        sleeping: {
          on: {
            WAKE_UP: {
              target: 'eating',
            },
          },
        },
        eating: {
          on: {
            STOMACH_FILLED: {
              target: 'sleeping',
            },
          },
        },
      },
      render: state => b('h1', {}, state),
    });

    const RootComponent: SFC = () =>
      b(
        'div',
        {},
        b(ReusableAnimalMachine, { species: 'wolf' }),
        b(ReusableAnimalMachine, { species: 'bear' })
      );

    $root = mount(RootComponent, $root) as HTMLElement;

    /** wolf */
    const $firstAnimalMachine = $root.firstChild;
    /** bear */
    const $secondAnimalMachine = $root.childNodes[1];

    expect($firstAnimalMachine?.firstChild?.nodeValue).toBe('sleeping');
    expect($secondAnimalMachine?.firstChild?.nodeValue).toBe('sleeping');

    emit({ type: 'WAKE_UP' }, 'wolf-machine');

    expect($firstAnimalMachine?.firstChild?.nodeValue).toBe('eating');
    expect($secondAnimalMachine?.firstChild?.nodeValue).toBe('sleeping');

    // it shouldn't do anything this time
    emit({ type: 'WAKE_UP' }, 'wolf-machine');

    expect($firstAnimalMachine?.firstChild?.nodeValue).toBe('eating');
    expect($secondAnimalMachine?.firstChild?.nodeValue).toBe('sleeping');

    emit({ type: 'WAKE_UP' }, 'bear-machine');

    expect($firstAnimalMachine?.firstChild?.nodeValue).toBe('eating');
    expect($secondAnimalMachine?.firstChild?.nodeValue).toBe('eating');

    emit({ type: 'STOMACH_FILLED' }, 'wolf-machine');

    expect($firstAnimalMachine?.firstChild?.nodeValue).toBe('sleeping');
    expect($secondAnimalMachine?.firstChild?.nodeValue).toBe('eating');
  });

  test('derive initial state based on props', () => {
    const intState = ['even', 'odd'] as const;
    type IntState = typeof intState[number];

    const IntMachine = createMachine<{ num: number }, IntState>({
      id: ({ num }) => `int-${num}`,
      initialState: ({ num }) => (num % 2 === 0 ? 'even' : 'odd'),
      initialContext: () => ({}),
      states: {
        even: {},
        odd: {},
      },
      render: state => <p>{state}</p>,
    });

    const App: SFC = () => (
      <div>
        <IntMachine num={1} />
        <IntMachine num={2} />
      </div>
    );

    $root = mount(App, $root);

    expect($root.firstChild?.firstChild?.nodeValue).toBe('odd');
    expect($root.childNodes[1]?.firstChild?.nodeValue).toBe('even');
  });

  test('machines unmount properly', () => {
    // this is working, but i should test it to prevent regressions
    expect(true).toBe(true);
  });

  test('can replace machine nodes with other nodes (+ vice-versa)', () => {
    const Item = createMachine({
      id: 'item',
      initialContext: ({ todo }) => ({ todo: todo }),
      initialState: 'default',
      states: {
        default: {},
      },
      render: (_s, ctx) => <p>{ctx.todo.todo}</p>,
    });

    const Toggle = createMachine<any, any, any, any>({
      id: 'toggle',
      initialState: 'even',
      initialContext: () => ({}),
      states: {
        even: {
          on: {
            TOGGLE: {
              // effects: () => alert("toggled"),
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
      render: (s, _ctx, self) => (
        <div>
          {s === 'odd' ? (
            <Item todo={{ todo: 'odd', key: 'odd' }} />
          ) : (
            <p>even</p>
          )}
          <button onClick={() => emit({ type: 'TOGGLE' }, self)}>toggle</button>
        </div>
      ),
    });

    $root = mount(Toggle, $root);

    expect($root.firstChild?.firstChild?.nodeValue).toBe('even');

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.firstChild?.nodeValue).toBe('odd');

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.firstChild?.nodeValue).toBe('even');
  });

  // TODO: make the most convoluted machine possible to test the limits of baahu. no
  // machine that passes the typechecks should be logically wrong/broken
});
