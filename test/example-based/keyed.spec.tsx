import { b, emit, mount, memo } from '../../src';
import { SFC, createMachine, MachineComponent } from '../../src/component';
import {
  machineRegistry,
  machinesThatTransitioned,
} from '../../src/machineRegistry';

/**
 * The first test generates 14 tests (7 unkeyed, 7 keyed)
 * for the diffing algorithms. Feel free to add
 * crazier lists to test accuracy
 *
 * TODO: test machine (not just element) node keyed diff!
 */

type BadVideoEvent = { type: 'LOADED' };
type BadVideoState = 'loading';

type ListItem = { key: string; todo: string };
type ListEvent = { type: 'TOGGLE' };
type ListState = 'first' | 'second';

const failures = [];

const BadVideoComponent = createMachine<{}, BadVideoState, BadVideoEvent>({
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
  testCase: string,
  type: 'element' | 'machine' | 'memo'
): MachineComponent<{}, ListState, ListEvent> {
  const ListMach: MachineComponent<{}, ListState, ListEvent> = createMachine<
    {},
    ListState,
    ListEvent
  >({
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
            ...listOne.map(item =>
              type === 'machine' ? (
                <ItemMachine
                  item={item}
                  key={diffType === 'keyed' ? item.key : undefined}
                />
              ) : type === 'memo' ? (
                <MemoItem
                  todo={item.todo}
                  key={diffType === 'keyed' ? item.key : undefined}
                />
              ) : (
                <p key={diffType === 'keyed' ? item.key : undefined}>
                  {item.todo}
                </p>
              )
            )
          );

        case 'second':
          return b(
            'div',
            {},
            ...listTwo.map(item =>
              type === 'machine' ? (
                <ItemMachine
                  item={item}
                  key={diffType === 'keyed' ? item.key : undefined}
                />
              ) : type === 'memo' ? (
                <MemoItem
                  todo={item.todo}
                  key={diffType === 'keyed' ? item.key : undefined}
                />
              ) : (
                <p key={diffType === 'keyed' ? item.key : undefined}>
                  {item.todo}
                </p>
              )
            )
          );
      }
    },
  });
  return ListMach;
}

const ItemMachine = createMachine<{ item: ListItem }>({
  id: ({ item }) => `item-${item.key}`,
  initialContext: ({ item }) => ({ item }),
  initialState: 'default',
  states: {
    default: {},
  },
  render: (_s, ctx) => <p>{ctx.item.todo}</p>,
});

const MemoItem = memo<{ todo: string }>(({ todo }) => <p>{todo}</p>);

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
      { key: 'a', todo: 'arise' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep' },
    ],
    listTwo: [
      { key: 'a', todo: 'arise' },
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
      { key: 'z', todo: 'sleep' },
    ],
  },
  moves: {
    listOne: [
      { key: 'a', todo: 'arise' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep' },
    ],
    listTwo: [
      { key: 'a', todo: 'arise' },
      {
        key: 'c',
        todo: 'lift',
      },
      { key: 'b', todo: 'eat' },
      { key: 'h', todo: 'read' },
      { key: 'f', todo: 'code' },
      { key: 'e', todo: 'brush' },
      { key: 'z', todo: 'sleep' },
    ],
  },
  sameKeys: {
    listOne: [
      { key: 'a', todo: 'arise' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep' },
    ],
    listTwo: [
      { key: 'a', todo: 'arise' },
      {
        key: 'b',
        todo: 'eat',
      },
      { key: 'c', todo: 'lift' },
      { key: 'd', todo: 'shower' },
      { key: 'e', todo: 'brush' },
      { key: 'f', todo: 'code' },
      { key: 'z', todo: 'sleep' },
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
  addOne: {
    listOne: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
    ],
    listTwo: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
      { key: 'c', todo: 'c' },
    ],
  },
  addThree: {
    listOne: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
    ],
    listTwo: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
      { key: 'c', todo: 'c' },
      { key: 'd', todo: 'd' },
      { key: 'e', todo: 'e' },
    ],
  },
  removeOne: {
    listOne: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
      { key: 'c', todo: 'c' },
    ],
    listTwo: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
    ],
  },
  removeThree: {
    listOne: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
      { key: 'c', todo: 'c' },
      { key: 'd', todo: 'd' },
      { key: 'e', todo: 'e' },
    ],
    listTwo: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
    ],
  },
  oneNewBeforeEnd: {
    listOne: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
      { key: 'c', todo: 'c' },
      { key: 'd', todo: 'd' },
    ],
    listTwo: [
      { key: 'a', todo: 'a' },
      { key: 'b', todo: 'b' },
      { key: 'c', todo: 'c' },
      { key: 'new', todo: 'new' },
      { key: 'd', todo: 'd' },
    ],
  },
};

/**
 * Testing diffing lists. The variety of lists ensures that
 * all diffing methods are tested. Each list type is tested
 * with keys and without keys.
 */
['keyed', 'unkeyed'].forEach(diffType => {
  describe(`${diffType} list diffing (element)`, () => {
    let $root = document.body;

    Object.keys(listMap).map(testCase => {
      test(testCase, () => {
        const { listOne, listTwo } = listMap[testCase];

        const ListMach = createListDiffComponent(
          listOne,
          listTwo,
          diffType,
          testCase,
          'element'
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

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listOne.length);

        // check if DOM correctly represents VDom (values)
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listOne[i].todo);
        });

        // now, emit toggle event. should change to represent second list
        emit({ type: 'TOGGLE' }, `listMach-${diffType}-${testCase}`);

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listTwo.length);

        // check if DOM correctly represents VDom (values) after 1 toggle
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listTwo[i].todo);
        });

        // target a different leaf machine, machine shouldn't rerender
        emit({ type: 'LOADED' });

        // now, render the first list again
        emit({ type: 'TOGGLE' }, `listMach-${diffType}-${testCase}`);

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listOne.length);

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

/**
 * Testing diffing lists. (but with machine nodes)
 * Only testing keyed diff, as reordering machines
 * without keys is sure to break them! also, here we
 * emit global events (the children will have the correct order either way,
 * but they won't rerender their content without targeted/global events)
 */
['keyed'].forEach(diffType => {
  describe(`${diffType} list diffing (machine)`, () => {
    let $root = document.body;

    Object.keys(listMap).map(testCase => {
      test(testCase, () => {
        const { listOne, listTwo } = listMap[testCase];

        const ListMach = createListDiffComponent(
          listOne,
          listTwo,
          diffType,
          testCase,
          'machine'
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

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listOne.length);

        // check if DOM correctly represents VDom (values)
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listOne[i].todo);
        });

        // now, emit toggle event. should change to represent second list
        emit({ type: 'TOGGLE' }, `listMach-${diffType}-${testCase}`);

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listTwo.length);

        // check if DOM correctly represents VDom (values) after 1 toggle
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listTwo[i].todo);
        });

        // target a different leaf machine, machine shouldn't rerender
        emit({ type: 'LOADED' });

        // now, render the first list again
        emit({ type: 'TOGGLE' }, `listMach-${diffType}-${testCase}`);

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listOne.length);

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

/**
 * Testing diffing lists. (but with memo nodes)
 * Only testing keyed diff, as reordering memo
 * without keys is pointless (the props would be supplied
 * to the wrong nodes, leading to extra rerenders)
 */
['keyed'].forEach(diffType => {
  describe(`${diffType} list diffing (memo)`, () => {
    let $root = document.body;

    Object.keys(listMap).map(testCase => {
      test(testCase, () => {
        const { listOne, listTwo } = listMap[testCase];

        const ListMach = createListDiffComponent(
          listOne,
          listTwo,
          diffType,
          testCase,
          'memo'
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

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listOne.length);

        // check if DOM correctly represents VDom (values)
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listOne[i].todo);
        });

        // now, emit toggle event. should change to represent second list
        emit({ type: 'TOGGLE' }, `listMach-${diffType}-${testCase}`);

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listTwo.length);

        // check if DOM correctly represents VDom (values) after 1 toggle
        $root.firstChild?.childNodes.forEach((child, i) => {
          expect(child.firstChild?.nodeValue).toBe(listTwo[i].todo);
        });

        // target a different leaf machine, machine shouldn't rerender
        emit({ type: 'LOADED' });

        // now, render the first list again
        emit({ type: 'TOGGLE' }, `listMach-${diffType}-${testCase}`);

        // length should be correct
        expect($root.firstChild?.childNodes?.length).toBe(listOne.length);

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

  // TODO: keyed diff for memo!
});
