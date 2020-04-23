/* eslint-disable @typescript-eslint/no-explicit-any */
import { MachineComponent, SFC } from './component';
import {
  machineRegistry,
  machinesThatStillExist,
  machinesThatTransitioned,
} from './machineRegistry';

export type TagName = keyof HTMLElementTagNameMap;

type ChildArg =
  | VNode
  | VNode[]
  | ChildArg[]
  | string
  | number
  | null
  | undefined
  | false;

export type ChildrenArg = Array<ChildArg>;

export type Props = Map<string, any>;

// DO NOT add optional keys to VNodes! more info: https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html

type TextVNode = {
  kind: VNodeKind.T;
  props: {
    nodeValue: string;
  };
  key: null;
};

type ElementVNode = {
  kind: VNodeKind.E;
  tag: TagName;
  key: string | number | null;
  props: Props | null;
  children: Array<VNode>;
};

/** unfortunately, i had to make this enum less readable bc the minifier wasn't doing the trick */
export enum VNodeKind {
  /** ELEMENT_NODE */
  E,
  /** TEXT_NODE */
  T,

  // /** MACHINE_NODE */
  // M,
  // /** FUNCTION_NODE */
  // F,
}

// export type VNode = ElementVNode | TextVNode | MachineVNode | FunctionVNode;
export type VNode = ElementVNode | TextVNode;

function createTextVNode(text: string): TextVNode {
  return {
    kind: VNodeKind.T,
    props: {
      nodeValue: text,
    },
    key: null,
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
          /** typeof null is object in js, so check for truthiness */
          child && children.push(child);
          break;
        }
      case 'string':
        children.push(createTextVNode(child));
        break;
      case 'number':
        children.push(createTextVNode(child.toString()));
        break;
    }
  }
  return children;
}

type TagType<Props extends PropsArg> =
  | SFC<Props>
  | MachineComponent<Props>
  | TagName;

/** createElement */
export function b<Props extends PropsArg>(
  type: TagType<Props>,
  /** I call them props for everything, but they are really attributes for ELEMENT_NODEs */
  props: Props | null | undefined,
  // TODO: type props better!! don't allow null when the machine/component has typed props!
  ...children: ChildrenArg
): VNode | null {
  switch (typeof type) {
    /** HTML element */
    case 'string':
      return {
        kind: VNodeKind.E,
        key: props && props.key ? props.key : null,
        tag: type,
        props: props ? new Map(Object.entries(props)) : null,
        children: processChildren(children),
      };

    /** stateless functional component */
    case 'function':
      // functional components don't need keys/special vnode representation. optional children
      const vNode = type(
        props as Props,
        children.length ? processChildren(children) : null
      );

      // assign given key to vnode
      props && props.key && vNode && (vNode.key = props.key);

      // TODO: memoized function instances

      return vNode ? vNode : null;

    /** pure sfc OR machine, stateful! */
    case 'object':
      // props can actually be null or undefined, so handle it properly in other fns
      const mProps: Props = props as Props;
      const instanceId =
        typeof type.id === 'function' ? type.id(mProps) : type.id;
      const existingInstance = machineRegistry.get(instanceId);

      /** add to "machinesThatStillExist" whether it is new or old */
      machinesThatStillExist.set(instanceId, true);

      /** initializing instance */
      if (!existingInstance) {
        const initialContext = type.initialContext
          ? type.initialContext(mProps)
          : {};

        type.onMount && type.onMount(initialContext);

        const stateHandler = type.states[type.initialState];

        if (process.env.NODE_ENV !== 'production') {
          if (!stateHandler) {
            throw new TypeError(
              `Machine ${instanceId} does not specify behavior for state: ${type.initialState}`
            );
          }
        }

        /** call onEntry for initial state */
        stateHandler.onEntry &&
          stateHandler.onEntry(initialContext, { type: 'MOUNT' }, instanceId);

        // NEW FEATURE: optional rendering for UI-less machines
        if (type.render) {
          const child = type.render(
            type.initialState,
            initialContext,
            instanceId,
            processChildren(children)
          );

          // assign given key to vnode
          props && props.key && child && (child.key = props.key);

          const newInstance = {
            id: instanceId,
            state: type.initialState,
            ctx: initialContext,
            spec: type,
            isLeaf: type.isLeaf ? type.isLeaf : false,
            lastChild: child,
          };
          machineRegistry.set(instanceId, newInstance);

          return child;
        } else return null;
      } else {
        /**
         * existing instance logic:
         * - check if UI-less machine; if so, return null
         * - check if leaf
         * - if not leaf, render with latest info from instance. set lastChild (idk what to do for TS..) return
         * - if leaf, check if transitioned
         * - if not, return lastChild.
         * - if it has transitioned, render with latest info from instance. set lastChild, return
         */
        if (!type.render) return null;

        if (existingInstance.isLeaf) {
          if (machinesThatTransitioned.has(existingInstance.id)) {
            /** separate logic from non-leaf instances because we need
             * to save the child vnode for later! */

            const child = type.render(
              existingInstance.state,
              existingInstance.ctx,
              existingInstance.id,
              processChildren(children)
            );

            // assign given key to vnode
            props && props.key && child && (child.key = props.key);

            existingInstance.lastChild = child;
            return child;
          } else {
            // yay, optimization! (leaf that hasn't transitioned)
            return existingInstance.lastChild;
          }
        } else {
          // not a leaf, just render

          const child = type.render(
            existingInstance.state,
            existingInstance.ctx,
            existingInstance.id,
            processChildren(children)
          );

          // assign given key to vnode
          props && props.key && child && (child.key = props.key);

          return child;
        }
      }

    default:
      throw new TypeError('invalid element');
  }
}

export interface PropsArg {
  ref?: RefCallback;
  key?: string | number;
  /** arbitrary keys */
  [key: string]: string | RefCallback | undefined | EventHandler | number;
}

// TODO: work on prop + attr types. the current interface works like this:
// if the component has specified its prop types (they should), it overrides
// PropsArg. an element can't speficy props, so it uses the default PropsArg

type RefCallback = (ref: HTMLElement) => void;
type EventHandler = (e: Event) => void;
