import { machine, b, mount, emit } from '../../../src';

describe('input', () => {
  test('works', () => {
    expect(true).toBe(true);
  });

  test('disable/enable button', () => {
    const ButtonMach = machine<{}>({
      id: 'button',
      initial: 'disabled',
      context: () => ({}),
      when: {
        disabled: {
          on: {
            ENABLE: {
              to: 'enabled',
            },
          },
        },
        enabled: {
          on: {
            DISABLE: {
              to: 'disabled',
            },
          },
        },
      },
      render: state => (
        <button disabled={state === 'disabled'}>my button</button>
      ),
    });

    const $root = mount(ButtonMach, document.body) as HTMLButtonElement;

    expect($root.disabled).toBe(true);

    emit({ type: 'ENABLE' });

    expect($root.disabled).toBe(false);

    emit({ type: 'DISABLE' });

    expect($root.disabled).toBe(true);
  });
});
