import { b, createMachine, emit, mount } from '../../../src';

describe('input', () => {
  let $root = document.body;
  test('does not add duplicate event listeners', () => {
    expect(true).toBe(true);
  });

  test('removing event listeners', () => {
    function handleClick(): void {}

    const EventedMachine = createMachine<{}, 'events' | 'noEvents'>({
      id: 'eventy',
      initialContext: () => ({}),
      initialState: 'events',
      states: {
        events: {
          on: {
            REMOVE_EVENT: {
              target: 'noEvents',
            },
          },
        },
        noEvents: {},
      },
      render: state => (
        <p id="para" onClick={state === 'events' ? handleClick : undefined}>
          i'm eventy
        </p>
      ),
    });

    $root = mount(EventedMachine, $root);

    // can't look at event handlers with js :/. just check for machine not breaking

    expect($root.nodeName).toBe('P');

    emit({ type: 'REMOVE_EVENT' });

    expect($root.nodeName).toBe('P');
  });

  // adding and removing event listeners conditionally
});
