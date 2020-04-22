// testing idea of skipping VNodes based on equality!

import baahu, { b } from '../../src';
import { SFC } from '../../src/component';

describe('optimizations', () => {
  test('detects equal/static vnodes', () => {
    const { mount, linkTo } = baahu();

    const myElement = b('div', null, b('p', null, 'tj'));

    const MySFC: SFC = () => {
      return b('div', null, myElement);
    };

    let $root = document.body;

    $root = mount(MySFC, $root) as HTMLElement;

    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe('tj');

    linkTo('/rerender');

    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe('tj');

    expect(true).toBe(true);
  });
});
