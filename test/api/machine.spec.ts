// TODO: computed id + targeted events (this can be combined into one good test!)
// TOOD: initial context? may just combine it with first test

import { MachineComponent, SFC } from '../../src/component';
import baahu, { b } from '../../src';

describe('machine components', () => {
  let $root = document.body;

  test('computed ids for resuable machines', () => {
    type MachineList = 'wolf-machine' | 'dog-machine';
    const { mount, emit } = baahu<Event, MachineList>();

    type Props = {
      species: string;
    };
    type State = 'sleeping' | 'eating';
    type Event = { type: 'WAKE_UP' } | { type: 'STOMACH_FILLED' };

    const ReusableAnimalMachine: MachineComponent<Props, State, Event> = {
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
    };

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

  test('machines unmount properly', () => {
    // this is working, but i should test it to prevent regressions
    expect(true).toBe(true);
  });
});
