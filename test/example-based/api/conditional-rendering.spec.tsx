import { b, machine, mount, emit } from '../../../src';
import { machineRegistry } from '../../../src/machineRegistry';

describe('conditional rendering', () => {
  let $root = document.body;

  test('one conditionally rendered element in div', () => {
    const Toggle = machine<any>({
      id: 'toggle',
      initial: 'even',
      context: () => ({}),
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
      render: state => (
        <div>
          <h1>title</h1>
          {state === 'even' && <p>even</p>}
        </div>
      ),
    });

    $root = mount(Toggle, $root);

    expect($root.firstChild?.firstChild?.nodeValue).toBe('title');
    expect($root.childNodes[1].nodeName).toBe('P');
    expect($root.childNodes[1].firstChild?.nodeValue).toBe('even');

    emit({ type: 'TOGGLE' }, 'toggle');

    expect($root.childNodes[1].nodeName).toBe('#text');

    emit({ type: 'TOGGLE' }, 'toggle');

    expect($root.firstChild?.firstChild?.nodeValue).toBe('title');
    expect($root.childNodes[1].nodeName).toBe('P');
    expect($root.childNodes[1].firstChild?.nodeValue).toBe('even');

    machineRegistry.clear();
  });

  test('two conditionally rendered elements in div', () => {
    const Toggle = machine<any>({
      id: 'toggle',
      initial: 'even',
      context: () => ({}),
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
      render: state => (
        <div>
          {state === 'even' && <p>even</p>}
          <h1>title</h1>

          {state === 'odd' && <p>odd</p>}
        </div>
      ),
    });

    $root = mount(Toggle, $root);

    expect($root.firstChild?.nodeName).toBe('P');
    expect($root.firstChild?.firstChild?.nodeValue).toBe('even');

    emit({ type: 'TOGGLE' }, 'toggle');

    // expect($root.childNodes[1].nodeName).toBe('#text');

    // emit({ type: 'TOGGLE' }, 'toggle');

    machineRegistry.clear();
  });
});
