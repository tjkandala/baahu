import { SFC } from '../../src/component';
import createBaahuApp, { b } from '../../src';
import { VNode } from '../../src/createElement';

describe('functional component patterns', () => {
  let $root = document.body;

  test("array 'fragment' children", () => {
    const { mount } = createBaahuApp();

    const RootComponent: SFC = () =>
      b('div', {}, b('h1', null, 'title'), [
        b('p', null, 'first array kid'),
        b('p', null, 'second array kid'),
      ]);

    $root = mount(RootComponent, $root) as HTMLElement;

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('H1');
    expect($root.childNodes.length).toBe(3);
  });

  test('render props', () => {
    const { mount } = createBaahuApp();

    type Props = {
      aRenderProp: () => VNode | null;
    };

    const RenderPropConsumer: SFC<Props> = ({ aRenderProp }) =>
      b('div', {}, aRenderProp());

    const RootComponent: SFC = () =>
      b(
        'div',
        {},
        b(RenderPropConsumer, {
          aRenderProp: () => b('p', {}, "i'm a render prop"),
        })
      );

    $root = mount(RootComponent, $root) as HTMLElement;

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('DIV');
    expect($root.firstChild?.firstChild?.nodeName).toBe('P');
    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe(
      "i'm a render prop"
    );
  });

  test('children, for layout components', () => {
    const { mount } = createBaahuApp();

    const Layout: SFC = ({}, children) =>
      b('div', {}, b('h3', {}, 'Layout Header'), children);

    const RootComponent: SFC = () =>
      b(
        Layout,
        {},
        b('p', {}, "i'm the first child"),
        b('p', {}, "i'm the second child")
      );

    $root = mount(RootComponent, $root) as HTMLElement;

    expect($root.nodeName).toBe('DIV');
    expect($root.firstChild?.nodeName).toBe('H3');
    expect($root.firstChild?.firstChild?.nodeValue).toBe('Layout Header');
    expect($root.childNodes[1].nodeName).toBe('P');
    expect($root.childNodes[1].firstChild?.nodeValue).toBe(
      "i'm the first child"
    );
    expect($root.childNodes[2].nodeName).toBe('P');
    expect($root.childNodes[2].firstChild?.nodeValue).toBe(
      "i'm the second child"
    );
  });
});
