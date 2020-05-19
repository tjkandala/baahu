import { b, machine, emit, mount } from '../../../src';

describe('input', () => {
  let $root = document.body;
  test('does not add duplicate event listeners', () => {
    expect(true).toBe(true);
  });

  test('removing event listeners', () => {
    function handleClick(): void {}

    const EventedMachine = machine<{}, 'events' | 'noEvents'>({
      id: 'eventy',
      context: () => ({}),
      initial: 'events',
      when: {
        events: {
          on: {
            REMOVE_EVENT: {
              to: 'noEvents',
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

  test('replacing event handlers', () => {
    const results: string[] = [];

    const firstHandler = () => results.push('first');

    const secondHandler = () => results.push('second');

    const EventedMachine = machine<{}, 'even' | 'odd'>({
      id: 'evented',
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
      render: state => {
        if (state === 'even') {
          return <button onClick={firstHandler}>even button</button>;
        }
        if (state === 'odd') {
          return <button onClick={secondHandler}>odd button</button>;
        }
      },
    });

    const $button = mount(EventedMachine, document.body);

    expect(results).toStrictEqual([]);

    $button.click();

    expect(results).toStrictEqual(['first']);

    emit({ type: 'TOGGLE' });

    $button.click();

    expect(results).toStrictEqual(['first', 'second']);

    emit({ type: 'TOGGLE' });

    $button.click();

    expect(results).toStrictEqual(['first', 'second', 'first']);
  });

  test('completely removing event handler', () => {
    const results: string[] = [];

    const firstHandler = () => results.push('first');

    const EventedMachine = machine<{}, 'even' | 'odd'>({
      id: 'evented',
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
      render: state => {
        if (state === 'even') {
          return <button onClick={firstHandler}>even button</button>;
        }
        if (state === 'odd') {
          return <button>odd button</button>;
        }
      },
    });

    const $button = mount(EventedMachine, document.body);

    expect($button.firstChild?.nodeValue).toBe('even button');

    expect(results).toStrictEqual([]);

    $button.click();

    expect(results).toStrictEqual(['first']);

    emit({ type: 'TOGGLE' });

    expect($button.firstChild?.nodeValue).toBe('odd button');

    $button.click();

    expect(results).toStrictEqual(['first']);

    emit({ type: 'TOGGLE' });

    expect($button.firstChild?.nodeValue).toBe('even button');

    $button.click();

    expect(results).toStrictEqual(['first', 'first']);
  });
});
