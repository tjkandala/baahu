/* eslint-disable @typescript-eslint/no-explicit-any */
import { MachineComponent, SFC } from './component';
import {
  machineRegistry,
  machinesThatTransitioned,
  renderType,
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
};

export type MachineVNode = {
  x: VNodeKind.Machine;
  t: null;
  k: string | number | null;
  a: null;
  /** one child */
  c: VNode;
  /** dom of a machine node is the same as its child (for brevity during diff) */
  d: HTMLElement | null;
  /** id (for machine node lookup in registry) */
  i: string;
};

/** unfortunately, i had to make this enum less readable bc the minifier wasn't doing the trick */
export enum VNodeKind {
  /** ELEMENT_NODE */
  Element,
  /** TEXT_NODE */
  Text,

  /** MACHINE_NODE */
  Machine,
  // /** FUNCTION_NODE */
  // F,
}

// export type VNode = ElementVNode | TextVNode | MachineVNode | FunctionVNode;
export type VNode = ElementVNode | TextVNode | MachineVNode;

function createTextVNode(text: string): TextVNode {
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
  type: SFC<Props> | MachineComponent<Props> | TagName,
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

          spec.onMount && spec.onMount(initialContext);

          const stateHandler = spec.states[initialState];

          if (process.env.NODE_ENV !== 'production') {
            if (!stateHandler) {
              throw new TypeError(
                `Machine ${instanceId} does not specify behavior for state: ${initialState}`
              );
            }
          }

          /** call onEntry for initial state */
          stateHandler.onEntry &&
            stateHandler.onEntry(initialContext, { type: 'MOUNT' }, instanceId);

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
          };

          const newInstance = {
            id: instanceId,
            st: initialState,
            ctx: initialContext,
            s: spec,
            l: spec.isLeaf ? spec.isLeaf : false,
            v: vNode,
            c: kids,
          };
          machineRegistry.set(instanceId, newInstance);

          return vNode;
        } else {
          const spec = existingInstance.s;

          /**
           * all the reasons that a machine can return its old value/vNode:
           * 1) it is a leaf that didnt transition
           * 2) renderType is 'tg' and it didn't transition
           *
           * reasons to rerender
           * 1) it is a leaf that transitioned
           * 2) renderType is 'targeted', but it transitioned (it is the targeted machine. in practice, this won't
           *    happen, as targeted machine render fn is called directly)
           * 3) renderType is 'global' or 'routing' (NOT 'tg')
           */
          if (
            (renderType.t === 't' || spec.isLeaf) &&
            !machinesThatTransitioned.has(existingInstance.id)
          ) {
            // yay, optimization! (leaf that hasn't transitioned)
            return existingInstance.v;
          } else {
            // not a leaf, or it is a leaf that has changed! rerender
            const kids = processChildren(children);
            const child = spec.render(
              existingInstance.st,
              existingInstance.ctx,
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
            };

            existingInstance.v = vNode;
            // children are cached for granular re-renders on events
            existingInstance.c = kids;

            return vNode;
          }
        }
      } else {
        // SFC/Stateless Functional Components
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
