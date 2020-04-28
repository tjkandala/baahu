import { b, createMachine, emit, mount } from '../../../src';

describe('attributes', () => {
  let $root = document.body;

  test('can add and remove class', () => {
    const AttrsMachine = createMachine<{}, 'attrs' | 'noAttrs'>({
      id: 'eventy',
      initialContext: () => ({}),
      initialState: 'attrs',
      states: {
        attrs: {
          on: {
            REMOVE_ATTRS: {
              target: 'noAttrs',
            },
          },
        },
        noAttrs: {
          on: {
            ADD_ATTRS: {
              target: 'attrs',
            },
          },
        },
      },
      render: state =>
        state === 'attrs' ? (
          <p id="para" class={state === 'attrs' ? 'machine' : undefined}>
            i'm eventy
          </p>
        ) : (
          <p id="para">i'm eventy</p>
        ),
    });

    $root = mount(AttrsMachine, $root);

    expect($root.className).toBe('machine');

    expect($root.nodeName).toBe('P');

    emit({ type: 'REMOVE_ATTRS' });

    expect($root.className).toBeFalsy();

    expect($root.nodeName).toBe('P');

    emit({ type: 'ADD_ATTRS' });

    expect($root.className).toBe('machine');

    expect($root.nodeName).toBe('P');
  });
});
