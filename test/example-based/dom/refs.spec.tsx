import { machine, mount, emit, b } from '../../../src';

test('refs', () => {
  let reffed = false;

  const RefMach = machine<{}>({
    id: 'reffer',
    initial: 'default',
    context: () => ({
      ref: null,
    }),
    when: {
      default: {
        on: {
          HI: {},
        },
      },
    },
    render: (_s, ctx) => {
      if (ctx.ref) reffed = true;

      return <p ref={ref => (ctx.ref = ref)}>reffer</p>;
    },
  });

  mount(RefMach, document.body);

  expect(reffed).toBe(false);

  emit({ type: 'HI' });

  expect(reffed).toBe(true);
});
