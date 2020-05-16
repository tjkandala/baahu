/* eslint-disable @typescript-eslint/no-explicit-any */
import { MachineComponent, SFC, MemoComponent } from './component';
import {
  machineRegistry,
  renderType,
  machinesThatMounted,
} from './machineRegistry';

export type TagName = keyof HTMLElementTagNameMap;

export type ChildArg =
  | VNode
  | VNode[]
  | ChildArg[]
  | string
  | number
  | null
  | undefined
  | boolean;

export type ChildrenArg = Array<ChildArg>;

// export type Props = Map<string, any>;

export type Props = {
  [k: string]: any;
};

// DO NOT add optional keys to VNodes! more info: https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html
// make them all have the same shape, but some values will have different meaning/nulled based on the
// discriminant, "kind"
// Also, had to make the property names super short because they can't be minified.
// Hover over the properties to see their full names

type TextVNode = {
  /** Kind of vNode */
  x: VNodeKind.Text;
  /** tag. used for element nodes */
  t: null;
  /** key */
  k: string | number | null;
  /** attributes */
  a: {
    /** nodeValue */
    n: string;
  };
  /** children */
  c: null;
  /** dom */
  d: Text | null;
  i: null;
  /** node depth (for global update opts). initialized during first render, spread by 'infection'
   * on subsequent renders */
  h: number | null;
};

export type ElementVNode = {
  x: VNodeKind.Element;
  t: string;
  k: string | number | null;
  /** attributes */
  a: Props | null;
  /** children */
  c: Array<VNode>;
  d: HTMLElement | null;
  /** id (for machine node lookup in registry) */
  i: null;
  /** node depth */
  h: number | null;
};

export type MachineVNode = {
  x: VNodeKind.Machine;
  t: null;
  k: string | number | null;
  a: null;
  /** one child */
  c: VNode;
  /** dom of a machine node is the same as its child (for brevity during diff) */
  d: HTMLElement | Text | null;
  /** id (for machine node lookup in registry) */
  i: string;
  /** node depth */
  h: number | null;
};

// for functions wrapped w/ memo (make them rerender on global events!)
export type MemoVNode = {
  x: VNodeKind.Memo;
  /** i of a lazyvnode is the functional component */
  t: SFC;
  k: string | number | null;
  /** a of a lazyvnode === props provided to SFC */
  a: Props | null | undefined;
  /** bc this is lazy, vnode child is not initialized until diff (expect for first render/routing) */
  c: VNode;
  d: HTMLElement | Text | null;
  i: null;
  /** node depth */
  h: number | null;
};

/** unfortunately, i had to make this enum less readable bc the minifier wasn't doing the trick */
export enum VNodeKind {
  /** ELEMENT_NODE */
  Element,
  /** TEXT_NODE */
  Text,

  /** MACHINE_NODE */
  Machine,
  // /** LAZY_NODE (functions) */
  Memo,
}

// export type VNode = ElementVNode | TextVNode | MachineVNode | MemoVNode;
export type VNode = ElementVNode | TextVNode | MachineVNode | MemoVNode;

export function createTextVNode(text: string): TextVNode {
  return {
    x: VNodeKind.Text,
    t: null,
    k: null,
    a: {
      n: text,
    },
    c: null,
    d: null,
    i: null,
    h: null,
  };
}

function processChildren(childrenArg: ChildrenArg): VNode[] {
  const children: VNode[] = [];
  let child: ChildArg;
  for (let i = 0; i < childrenArg.length; i++) {
    child = childrenArg[i];

    switch (typeof child) {
      case 'object':
        if (Array.isArray(child)) {
          const nested = processChildren(child);
          for (let j = 0; j < nested.length; j++) {
            children.push(nested[j]);
          }
          break;
        } else {
          /** typeof null is object in js, so check (truthiness check is expensive) */
          child !== null && children.push(child);
          break;
        }
      case 'string':
        children.push(createTextVNode(child));
        break;
      case 'number':
        children.push(createTextVNode(child.toString()));
        break;
      /** to maintain vdom structure for short-circuiting,
       * e.g. 'condition && <div>{stuff}</div>' could return false
       *  OR
       * e.g. 'condition || <div>{stuff}</div>' could return true
       *
       * might add a 'nullVNode' VNode type later, as opposed to empty text node
       */
      case 'boolean':
        // basically nullVNnode, but with accurate .d property
        // children.push(nullVNode);
        children.push(createTextVNode(''));
        break;
    }
  }
  return children;
}

// const nullVNode: TextVNode = {
//   x: VNodeKind.Text,
//   t: null,
//   k: null,
//   a: {
//     n: '',
//   },
//   c: null,
//   d: null,
//   i: null,
// };

/** createElement */
export function b<Props extends PropsArg>(
  type: SFC<Props> | MachineComponent<Props> | MemoComponent<Props> | TagName,
  /** I call them props for everything, but they are really attributes for ELEMENT_NODEs */
  props: (Props & { key?: string | number }) | null | undefined,
  ...children: ChildrenArg
): VNode {
  switch (typeof type) {
    /** HTML element */
    case 'string':
      return {
        x: VNodeKind.Element,
        k: props && props.key ? props.key : null,
        t: type,
        a: props || null,
        c: processChildren(children),
        d: null,
        i: null,
        h: null,
      };

    /** machine components or SFCs */
    case 'function':
      // if the function has an id property, its a machine component
      if ('id' in type) {
        // asserting props here because it doesn't matter if props are null/undefined here
        const mProps = props as Props;
        const instanceId =
          typeof type.id === 'function' ? type.id(mProps) : type.id;

        const existingInstance = machineRegistry.get(instanceId);

        /** initializing instance */
        if (!existingInstance) {
          const spec = type(mProps);

          const initialContext = spec.initialContext
            ? spec.initialContext(mProps)
            : {};

          const initialState =
            typeof spec.initialState === 'function'
              ? spec.initialState(mProps)
              : spec.initialState;

          machinesThatMounted.add(instanceId);

          // spec.onMount && spec.onMount(initialContext); // has been moved to `machineDuty()`

          // const stateHandler = spec.states[initialState];

          // if (process.env.NODE_ENV !== 'production') {
          //   if (!stateHandler) {
          //     throw new TypeError(
          //       `Machine ${instanceId} does not specify behavior for state: ${initialState}`
          //     );
          //   }
          // }

          // /** call onEntry for initial state */
          // stateHandler.onEntry &&
          //   stateHandler.onEntry(initialContext, { type: 'MOUNT' }, instanceId);

          const kids = processChildren(children);
          const child = spec.render(
            initialState,
            initialContext,
            instanceId,
            kids
          );

          const vNode: MachineVNode = {
            x: VNodeKind.Machine,
            t: null,
            // can't just check for truthiness, or 0
            // becomes a null key
            k: props && props.key != null ? props.key : null,
            // k: instanceId,
            a: null,
            c: child ? child : createTextVNode(''),
            d: null,
            i: instanceId,
            h: null,
          };

          const newInstance = {
            id: instanceId,
            st: initialState,
            x: initialContext,
            s: spec,
            v: vNode,
            c: kids,
          };
          machineRegistry.set(instanceId, newInstance);

          return vNode;
        } else {
          const spec = existingInstance.s;

          /**
           * machines are rendered by nodeDepth order in emit().
           * only render them here for routing-type renders
           * (so route changes and inital mount!)
           */
          if (renderType.t !== 'r') {
            // yay, optimization! (leaf that hasn't transitioned)
            return existingInstance.v;
          } else {
            /**
             * NEW OPTS! only rerender here on route change! (to keep nested routers simple)
             */

            // not a leaf, or it is a leaf that has changed! rerender
            const kids = processChildren(children);
            const child = spec.render(
              existingInstance.st,
              existingInstance.x,
              existingInstance.id,
              kids
            );

            const vNode: MachineVNode = {
              x: VNodeKind.Machine,
              t: null,
              // can't just check for truthiness, or 0
              // becomes a null key
              k: props && props.key != null ? props.key : null,
              // k: instanceId,
              a: null,
              c: child ? child : createTextVNode(''),
              d: null,
              i: instanceId,
              h: null,
            };

            existingInstance.v = vNode;
            // children are cached for granular re-renders on events
            existingInstance.c = kids;

            return vNode;
          }
        }
      } else if ('memo' in type) {
        /**
         * 'memoized' functional components
         */

        // this doesn't actually do anything but return the SFC. TSX tricks!
        const sfc = type(props as Props);

        const child =
          renderType.t === 'r'
            ? sfc(
                props as Props,
                children.length ? processChildren(children) : null
              )
            : createTextVNode('');

        const memoVNode: MemoVNode = {
          x: VNodeKind.Memo,
          t: sfc,
          // can't just check for truthiness, or 0
          // becomes a null key
          k: props && props.key != null ? props.key : null,
          a: props,
          c: child || createTextVNode(''),
          /** render their child when render type is r. this is important for first render/routing!
           * be lazy when it's a diff. decide whether to render or use the old child in diff()
           */
          d: null,
          i: null,
          h: null,
        };

        return memoVNode;
      } else {
        // SFC/Stateless Functional Components.

        const vNode = type(
          props as Props,
          children.length ? processChildren(children) : null
        );

        // assign given key to vnode
        props && props.key && vNode && (vNode.k = props.key);

        return vNode ? vNode : createTextVNode('');
      }

    default:
      throw new TypeError('invalid element');
  }
}

export interface PropsArg {
  key?: string | number;
  /** arbitrary keys */
  [key: string]: any;
}
