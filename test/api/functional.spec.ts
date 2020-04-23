import { SFC, memo } from '../../src/component';
import createBaahuApp, { b } from '../../src';
import { VNode } from '../../src/createElement';

describe('functional component patterns', () => {
  let $root = document.body;

  test('memo', () => {
    const nonMemoArray: string[] = [];
    const memoArray: string[] = [];

    const MyComp: SFC<{ name: string }> = ({ name }) => {
      nonMemoArray.push('rendered');
      return b('div', null, b('p', null, `good stuff ${name}`));
    };

    const MemoMyComp: SFC<{ name: string }> = memo(({ name }) => {
      memoArray.push('rendered');
      return b('div', null, b('p', null, `good stuff ${name}`));
    });

    let changingName = 'TJ';

    const MyApp: SFC = () =>
      b(
        'div',
        null,
        b(MyComp, { name: 'TJ' }),
        b(MemoMyComp, { name: changingName })
      );

    const { linkTo, mount } = createBaahuApp();

    $root = mount(MyApp, $root) as HTMLElement;

    expect(nonMemoArray.length).toBe(1);
    expect(memoArray.length).toBe(1);

    linkTo('rerender');

    expect(nonMemoArray.length).toBe(2);
    expect(memoArray.length).toBe(1);

    changingName = 'kandala';

    linkTo('rerender');

    expect(nonMemoArray.length).toBe(3);
    expect(memoArray.length).toBe(2);

    expect(true).toBe(true);
  });

  // test('memo map return', () => {
  //   const memoArray: string[] = [];

  //   const names = ['TJ', 'Kandala', 'baahu'];

  //   const MemoMyComp: SFC<{ name: string }> = memo(({ name }) => {
  //     memoArray.push('rendered');
  //     return b('div', null, b('p', null, `good stuff ${name}`));
  //   });

  //   const MyApp: SFC = () =>
  //     b(
  //       'div',
  //       null,

  //       names.map(name => b(MemoMyComp, { name }))
  //     );

  //   const { linkTo, mount } = createBaahuApp();

  //   $root = mount(MyApp, $root) as HTMLElement;

  //   expect(memoArray.length).toBe(names.length);

  //   linkTo('rerender');

  //   expect(memoArray.length).toBe(names.length);
  // });

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
      b('div', {}, b('h3', {}, 'Layout Header'), ...children);

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
