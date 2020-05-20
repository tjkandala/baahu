import { machine, b, mount, emit, memo } from '../../../src';
import { machineRegistry } from '../../../src/machineRegistry';

describe('replacing nodes of diff types', () => {
  test('replace element with text node', () => {
    const EleText = machine<{}, 'ele' | 'text'>({
      id: 'eletext',
      initial: 'ele',
      context: () => ({}),
      when: {
        ele: {
          on: {
            TOGGLE: {
              to: 'text',
            },
          },
        },
        text: {
          on: {
            TOGGLE: {
              to: 'ele',
            },
          },
        },
      },
      render: state => {
        if (state === 'ele') {
          return (
            <div>
              <p>hi</p>
            </div>
          );
        }

        if (state === 'text') {
          return <div>hi</div>;
        }
      },
    });

    const $root = mount(EleText, document.body);

    expect($root.firstChild?.firstChild?.nodeValue).toBe('hi');

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.nodeValue).toBe('hi');

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.firstChild?.nodeValue).toBe('hi');
  });

  test('replace memo node with machine node, deletes nested machine', () => {
    const TextMachine = machine({
      id: 'text',
      initial: 'default',
      context: () => ({}),
      when: {
        default: {},
      },
      render() {
        return (
          <div>
            <p>text machine</p>
            <Nested />
          </div>
        );
      },
    });

    const Nested = machine({
      id: 'nested',
      initial: 'default',
      context: () => ({}),
      when: {
        default: {},
      },
      render: () => <p>nested</p>,
    });

    const MemoText = memo(() => <p>memo text</p>);

    const Toggle = machine<{}, 'even' | 'odd'>({
      id: 'toggle',
      initial: 'even',
      context: () => ({}),
      when: {
        even: {
          on: {
            TOGGLE: { to: 'odd' },
          },
        },
        odd: {
          on: {
            TOGGLE: { to: 'even' },
          },
        },
      },
      render: state => {
        if (state === 'even') {
          return <MemoText />;
        }
        if (state === 'odd') {
          return <TextMachine />;
        }
      },
    });

    const $root = mount(
      () => (
        <div>
          <Toggle />
        </div>
      ),
      document.body
    );

    expect(machineRegistry.size).toBe(1);

    expect($root.firstChild?.firstChild?.nodeValue).toBe('memo text');

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe(
      'text machine'
    );

    expect(machineRegistry.size).toBe(3);

    emit({ type: 'TOGGLE' });

    expect($root.firstChild?.firstChild?.nodeValue).toBe('memo text');

    expect(machineRegistry.size).toBe(1);
  });
});
