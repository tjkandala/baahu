/* eslint-disable @typescript-eslint/no-explicit-any */
import { MachineComponent, SFC } from './component';
import {
  machineRegistry,
  machinesThatStillExist,
  machinesThatTransitioned,
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
  | false;

export type ChildrenArg = Array<ChildArg>;

export type Props = Map<string, any>;

// DO NOT add optional keys to VNodes! more info: https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html
// make them all have the same shape, but some values will have different meaning/nulled based on the
// discriminant, "kind"

type TextVNode = {
  kind: VNodeKind.T;
  tag: null;
  key: string | number | null;
  props: {
    nodeValue: string;
  };
  children: null;
  dom: Text | null;
};

// TODO: change children to kids

type ElementVNode = {
  kind: VNodeKind.E;
  tag: string;
  key: string | number | null;
  props: Props | null;
  children: Array<VNode>;
  dom: HTMLElement | null;
};

export type MachineVNode = {
  kind: VNodeKind.M;
  tag: null;
  key: string | number | null;
  props: null;
  children: VNode;
  dom: null;
};

/** unfortunately, i had to make this enum less readable bc the minifier wasn't doing the trick */
export enum VNodeKind {
  /** ELEMENT_NODE */
  E,
  /** TEXT_NODE */
  T,

  /** MACHINE_NODE */
  M,
  // /** FUNCTION_NODE */
  // F,
}

// export type VNode = ElementVNode | TextVNode | MachineVNode | FunctionVNode;
export type VNode = ElementVNode | TextVNode | MachineVNode;

function createTextVNode(text: string): TextVNode {
  return {
    kind: VNodeKind.T,
    tag: null,
    key: null,
    props: {
      nodeValue: text,
    },
    children: null,
    dom: null,
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

const nullVNode: TextVNode = {
  kind: VNodeKind.T,
  tag: null,
  key: null,
  props: {
    nodeValue: '',
  },
  children: null,
  dom: null,
};

/** createElement */
export function b<Props extends PropsArg>(
  type: SFC<Props> | MachineComponent<Props> | TagName,
  /** I call them props for everything, but they are really attributes for ELEMENT_NODEs */
  props: (Props & { key?: string | number }) | null | undefined,
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
        dom: null,
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

        /** add to "machinesThatStillExist" whether it is new or old */
        machinesThatStillExist.set(instanceId, true);

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

          const child = spec.render(
            initialState,
            initialContext,
            instanceId,
            processChildren(children)
          );

          const vNode: MachineVNode = {
            kind: VNodeKind.M,
            tag: null,
            key: props && props.key ? props.key : null,
            props: null,
            children: child ? child : nullVNode,
            dom: null,
          };

          const newInstance = {
            id: instanceId,
            state: initialState,
            ctx: initialContext,
            spec: spec,
            isLeaf: spec.isLeaf ? spec.isLeaf : false,
            vNode: vNode,
          };
          machineRegistry.set(instanceId, newInstance);

          return vNode;
        } else {
          /**
           * existing instance logic:
           * - check if UI-less machine; if so, return null (no UI-less machines yet)
           * - check if leaf
           * - if not leaf, render with latest info from instance. set lastChild (idk what to do for TS..) return
           * - if leaf, check if transitioned
           * - if not, return lastChild.
           * - if it has transitioned, render with latest info from instance. set lastChild, return
           */
          const spec = existingInstance.spec;
          // if (!spec.render) return null;

          if (
            spec.isLeaf &&
            !machinesThatTransitioned.has(existingInstance.id)
          ) {
            // yay, optimization! (leaf that hasn't transitioned)
            return existingInstance.vNode;
          } else {
            // not a leaf, or it is a leaf that has changed! rerender
            const child = spec.render(
              existingInstance.state,
              existingInstance.ctx,
              existingInstance.id,
              processChildren(children)
            );

            const vNode: MachineVNode = {
              kind: VNodeKind.M,
              tag: null,
              key: props && props.key ? props.key : null,
              props: null,
              children: child ? child : nullVNode,
              dom: null,
            };

            existingInstance.vNode = vNode;

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
        props && props.key && vNode && (vNode.key = props.key);

        return vNode ? vNode : null;
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

// TODO: work on prop + attr types. the current interface works like this:
// if the component has specified its prop types (they should), it overrides
// PropsArg. an element can't speficy props, so it uses the default PropsArg

// type RefCallback = (ref: HTMLElement) => void;
// type EventHandler = (e: Event) => void;
