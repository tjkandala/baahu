import { b, emit, mount } from '../../src';
import { SFC, createMachine, MachineComponent } from '../../src/component';
import {
  machineRegistry,
  machinesThatTransitioned,
} from '../../src/machineRegistry';

/**
 * The first test generates 14 tests (7 unkeyed, 7 keyed)
 * for the diffing algorithms. Feel free to add
 * crazier lists to test accuracy
 */

type BadVideoEvent = { type: 'LOADED' };
type BadVideoState = 'loading';

type ListItem = { key: string; todo: string };
type ListEvent = { type: 'TOGGLE' };
type ListState = 'first' | 'second';

const failures = [];

const BadVideoComponent = createMachine<{}, BadVideoState, BadVideoEvent>({
  // make it optional, default to false
  isLeaf: false,
  id: 'video',
  initialContext: () => ({}),
  initialState: 'loading',
  states: {
    loading: {
      on: {
        LOADED: {
          effects: [() => failures.push('another one')],
        },
      },
    },
  },
  render() {
    return b('div', null, b('p', null, 'this component sucks'));
  },
});

function createListDiffComponent(
  listOne: ListItem[],
  listTwo: ListItem[],
  diffType: string,
  testCase: string
): MachineComponent<{}, ListState, ListEvent> {
  const ListMach: MachineComponent<{}, ListState, ListEvent> = createMachine<
    {},
    ListState,
    ListEvent
  >({
    isLeaf: true,
    id: `listMach-${diffType}-${testCase}`,
    initialContext: () => ({}),
    initialState: 'first',
    states: {
      first: {
        on: {
          TOGGLE: {
            target: 'second',
          },
        },
      },
      second: {
        on: {
          TOGGLE: { target: 'first' },
        },
      },
    },
    render: state => {
      switch (state) {
        case 'first':
          return b(
            'div',
            {},
            ...listOne.map(item => (
              <p key={diffType === 'keyed' ? item.key : undefined}>
                {item.todo}
              </p>
            ))
          );

        case 'second':
          return b(
            'div',
            {},
            ...listTwo.map(item => (
              <p key={diffType === 'keyed' ? item.key : undefined}>
                {item.todo}
              </p>
            ))
          );
      }
    },
  });
  return ListMach;
}

/** keys represent test cases */
type ListMap = {
  [key: string]: {
    listOne: ListItem[];
    listTwo: ListItem[];
  };
};

const listMap: ListMap = {
  commonPrefix: {
    listOne: [
      { key: 'a', todo: 'wake up' },
      { key: 'b', todo: 'brush' },
      { key: 'c', todo: 'eat' },
      { key: 'ad', todo: 'go outside' },
      { key: 'ae', todo: 'run' },
    ],
    listTwo: [
      { key: 'a', todo: 'wake up' },
      { key: 'b', todo: 'brush' },
      { key: 'c', todo: 'eat' },
      { key: 'bd', todo: 'drink coffee' },
      { key: 'be', todo: 'code' },
      { key: 'bf', todo: 'write' },
      { key: 'bg', todo: 'read' },
    ],
  },
  commonSuffix: {
    listOne: [
      { key: 'aa', todo: 'go to class' },
      { key: 'ab', todo: 'go to the lib' },
      { key: 'ac', todo: 'do hw' },
      { key: 'w', todo: 'ball' },
      { key: 'x', todo: "eat zaxby's" },
      { key: 'y', todo: 'hot shower' },
      { key: 'z', todo: 'sleep' },
    ],
    listTwo: [
      { key: 'ba', todo: 'go to work' },
      { key: 'bb', todo: 'code' },
      { key: 'w', todo: 'ball' },
      { key: 'x', todo: "eat zaxby's" },
      { key: 'y', todo: 'hot shower' },
      { key: 'z', todo: 'sleep' },
    ],
  },
  commonPrefixAndSuffix: {
    listOne: [
      { key: 'a', todo: 'arise-one' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep-one' },
    ],
    listTwo: [
      { key: 'a', todo: 'arise-two' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'tj', todo: 'you are' },
      { key: 'tjk', todo: 'my mla' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep-two' },
    ],
  },
  moves: {
    listOne: [
      { key: 'a', todo: 'arise-one' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep-one' },
    ],
    listTwo: [
      { key: 'a', todo: 'arise-two' },
      {
        key: 'c',
        todo: 'lift',
      },
      { key: 'b', todo: 'eat' },
      { key: 'h', todo: 'read' },
      { key: 'f', todo: 'code' },
      { key: 'e', todo: 'brushee' },
      { key: 'z', todo: 'sleep-two' },
    ],
  },
  sameKeys: {
    listOne: [
      { key: 'a', todo: 'arise-one' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep-one' },
    ],
    listTwo: [
      { key: 'a', todo: 'arise-two' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep-two' },
    ],
  },
  oldListEmpty: {
    listOne: [],
    listTwo: [
      { key: 'ba', todo: 'go to work' },
      { key: 'bb', todo: 'code' },
      { key: 'w', todo: 'ball' },
      { key: 'x', todo: "eat zaxby's" },
      { key: 'y', todo: 'hot shower' },
      { key: 'z', todo: 'sleep' },
    ],
  },
  newListEmpty: {
    listOne: [
      { key: 'ba', todo: 'go to work' },
      { key: 'bb', todo: 'code' },
      { key: 'w', todo: 'ball' },
      { key: 'x', todo: "eat zaxby's" },
      { key: 'y', todo: 'hot shower' },
      { key: 'z', todo: 'sleep' },
    ],
    listTwo: [],
  },
};

/**
 * Testing diffing lists. The variety of lists ensures that
 * all diffing methods are tested. Each list type is tested
 * with keys and without keys.
 */
['keyed', 'unkeyed'].forEach(diffType => {
  describe(`${diffType} list diffing`, () => {
    let $root = document.body;

    Object.keys(listMap).map(testCase => {
      test(testCase, () => {
        const { listOne, listTwo } = listMap[testCase];

        const ListMach = createListDiffComponent(
          listOne,
          listTwo,
          diffType,
          testCase
        );

        const MyLayout: SFC = () =>
          b(
            'div',
            null,
            b(ListMach, null),
            b('h1', null, 'good tests'),
            b(BadVideoComponent, null)
          );

        $root = mount(MyLayout, $root) as HTMLElement;

        expect($root.nodeName).toBe('DIV');

        // check if DOM correctly represents VDom (values)
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listOne[i].todo);
        });

        // now, emit toggle event. should change to represent second list
        emit({ type: 'TOGGLE' }, `listMach-${diffType}-${testCase}`);

        // check if DOM correctly represents VDom (values) after 1 toggle
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listTwo[i].todo);
        });

        // target a different leaf machine, machine shouldn't rerender
        emit({ type: 'LOADED' });

        // now, render the first list again
        emit({ type: 'TOGGLE' }, `listMach-${diffType}-${testCase}`);

        // check if DOM correctly represents VDom (values) after 2 toggles
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listOne[i].todo);
        });
      });

      // have to clear bc its the same app instance
      machineRegistry.clear();
      machinesThatTransitioned.clear();
    });
  });
});

describe('basic events', () => {
  type MyState = 'running' | 'complete';
  type MyEvent = { type: 'CHANGE_TEXT' } | { type: 'COMPLETED' };
  type MyContext = { text: string };

  function updateText(ctx: MyContext): void {
    ctx.text = ctx.text + '!';
  }

  const testMach = createMachine<{}, MyState, MyEvent, MyContext>({
    isLeaf: true,
    id: 'testMach',
    initialContext: () => ({
      text: 'initial text',
    }),
    initialState: 'running',
    states: {
      running: {
        on: {
          CHANGE_TEXT: {
            effects: [updateText],
          },
          COMPLETED: {
            target: 'complete',
          },
        },
      },
      complete: {},
    },
    render: (s, ctx) => b('div', {}, b('h1', {}, ctx.text), b('p', {}, s)),
  });

  let $root = document.body;

  test('context changes, reflected in render', () => {
    $root = mount(testMach, $root) as HTMLElement;
    expect($root.firstChild?.firstChild?.nodeValue).toBe('initial text');

    // wrong target, shouldn't change it
    emit({ type: 'CHANGE_TEXT' }, 'wrongID');
    expect($root.firstChild?.firstChild?.nodeValue).toBe('initial text');
    // correct target, should work
    emit({ type: 'CHANGE_TEXT' }, 'testMach');
    expect($root.firstChild?.firstChild?.nodeValue).toBe('initial text!');
    // wild card events should work too
    emit({ type: 'CHANGE_TEXT' });
    expect($root.firstChild?.firstChild?.nodeValue).toBe('initial text!!');
  });

  test('state changes, reflected in render', () => {
    expect(true).toBe(true);

    $root = mount(testMach, $root) as HTMLElement;
    expect($root.childNodes[1].firstChild?.nodeValue).toBe('running');
    emit({ type: 'COMPLETED' }, 'testMach');
    expect($root.childNodes[1].firstChild?.nodeValue).toBe('complete');
  });
});

describe('can replace nodes of different types', () => {
  let $root = document.body;

  test('works', () => {
    type State = 'one' | 'two';
    type MyEvent = { type: 'TOGGLE' };

    const ToggleMachine = createMachine<{}, State, MyEvent>({
      isLeaf: true,
      id: 'toggle',
      initialContext: () => ({}),
      initialState: 'one',
      states: {
        one: {
          on: {
            TOGGLE: {
              target: 'two',
            },
          },
        },
        two: {
          on: {
            TOGGLE: {
              target: 'one',
            },
          },
        },
      },
      render: state => {
        switch (state) {
          case 'one':
            return b('div', {}, b('input', { type: 'text', value: 'one' }));

          case 'two':
            return b('div', {}, 'two');
        }
      },
    });

    $root = mount(ToggleMachine, $root) as HTMLElement;

    expect($root.firstChild?.nodeName).toBe('INPUT');

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.nodeName).toBe('#text');

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.nodeName).toBe('INPUT');
  });
});
