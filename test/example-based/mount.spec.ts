import baahu, { b } from '../../src';
import { SFC, createMachine } from '../../src/component';

describe('mounting', () => {
  const { mount } = baahu();

  const TestMach = createMachine({
    isLeaf: true,
    id: 'testRoot',
    initialContext: () => ({}),
    initialState: 'ready',
    states: {
      ready: {},
    },
    render: () => b('div', {}, b('h1', {}, 'mach test')),
  });

  let $root = document.body;

  test('mount simple machine', () => {
    $root = mount(TestMach, $root) as HTMLElement;

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('H1');
    expect($root.firstChild?.firstChild?.nodeValue).toBe('mach test');
  });

  const TestFun: SFC = () => b('div', {}, b('h3', {}, 'sfc test'));

  test('mount simple function', () => {
    $root = mount(TestFun, $root) as HTMLElement;

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('H3');
    expect($root.firstChild?.firstChild?.nodeValue).toBe('sfc test');
  });
});
