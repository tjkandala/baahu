import { MachineComponent } from '../../src/component';
import baahu, { b } from '../../src';

describe('real world events', () => {
  type MyState = 'loading' | 'ready' | 'complete';
  type MyEvent = { type: 'FINISHED_LOADING' } | { type: 'PROCESSED_DATA' };

  let $root = document.body;

  test('events that lead to other sync events', () => {
    /** this is not a really a good pattern (why not just do the work in one
     * transition, intermediate state would never be rendered anyways), but
     * I want to test that the framework works in predictable ways */
    const { mount, emit } = baahu<MyEvent>();

    function processData(): void {
      // do some work (synchronously), then emit event
      emit({ type: 'PROCESSED_DATA' });
    }

    const NestedEventMach: MachineComponent<{}, MyState, MyEvent> = {
      id: 'nestedEventMach',
      initialContext: () => ({}),
      initialState: 'loading',
      states: {
        loading: {
          on: {
            FINISHED_LOADING: {
              target: 'ready',
            },
          },
        },
        ready: {
          onEntry: processData,
          on: {
            PROCESSED_DATA: {
              target: 'complete',
            },
          },
        },
        complete: {},
      },
      render: state => b('h1', {}, state),
    };

    $root = mount(NestedEventMach, $root) as HTMLElement;

    expect($root.firstChild?.nodeValue).toBe('loading');

    emit({ type: 'FINISHED_LOADING' });

    expect($root.firstChild?.nodeValue).toBe('complete');
  });

  test('async events', () => {
    const { mount, emit } = baahu<MyEvent>();

    function processData(): void {
      // do some work (async), then emit event
      new Promise(res => {
        setTimeout(() => res(true), 0);
      }).then(() => emit({ type: 'PROCESSED_DATA' }));
    }

    const NestedEventMach: MachineComponent<{}, MyState, MyEvent> = {
      id: 'nestedEventMachAsync',
      initialContext: () => ({}),
      initialState: 'loading',
      states: {
        loading: {
          on: {
            FINISHED_LOADING: {
              target: 'ready',
            },
          },
        },
        ready: {
          onEntry: processData,
          on: {
            PROCESSED_DATA: {
              target: 'complete',
            },
          },
        },
        complete: {},
      },
      render: state => b('h1', {}, state),
    };

    $root = mount(NestedEventMach, $root) as HTMLElement;

    expect($root.firstChild?.nodeValue).toBe('loading');

    emit({ type: 'FINISHED_LOADING' });

    expect($root.firstChild?.nodeValue).toBe('ready');

    return new Promise(res => {
      setTimeout(() => res(true), 0);
    }).then(() => expect($root.firstChild?.nodeValue).toBe('complete'));
  });
});
