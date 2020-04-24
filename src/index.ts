import { baahu } from './main';
import { b } from './createElement';
import { memoInstance, createMachine } from './component';

export { b, memoInstance, createMachine };
export default baahu;

declare global {
  module JSX {
    interface IntrinsicElements {
      [tag: string]: any;
    }

    interface ElementChildrenAttribute {
      children: {};
    }

    // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts#L348
  }
}
