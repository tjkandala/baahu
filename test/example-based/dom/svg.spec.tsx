import { mount, b } from '../../../src';

test('works', () => {
  const App = () => (
    <div>
      <svg height="100" width="100">
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="black"
          stroke-width="3"
          fill="red"
        />
      </svg>
    </div>
  );

  let $root = document.body;

  $root = mount(App, $root);

  expect($root.firstChild?.nodeName).toBe('svg');
  expect($root.firstChild?.firstChild?.nodeName).toBe('circle');
});
