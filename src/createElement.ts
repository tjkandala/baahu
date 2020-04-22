/* eslint-disable @typescript-eslint/no-explicit-any */
import { MachineComponent, SFC } from './component';
import { machineRegistry, machinesThatStillExist } from './machineRegistry';

export type TagName = keyof HTMLElementTagNameMap;

type RefCallback = (ref: HTMLElement) => void;
type EventHandler = (e: Event) => void;

export interface PropsArg {
  ref?: RefCallback;
  key?: string | number;
  /** arbitrary keys */
  [key: string]: string | RefCallback | undefined | EventHandler | number;
}

type ChildArg = VNode | string | number | null | undefined | false;

export type ChildrenArg = Array<ChildArg>;

export type Props = Map<string, any>;

export type MachineInstance = {
  id: string;
  state: string;
  ctx: object;
  /** the spec is the object created by developers. it describes how the machine instance,
   * which created by Baahu, should behave */
  spec: MachineComponent;
};

/** unfortunately, i had to make this enum less readable bc the minifier wasn't doing the trick */
export enum VNodeKind {
  /** ELEMENT_NODE */
  E,
  /** TEXT_NODE */
  T,
  /** MACHINE_NODE */
  M,
}

export type MachineVNode = {
  kind: VNodeKind.M;
  key: string | number | undefined;
  mInst: MachineInstance;
  /** a component only has one child. stateless components don't need to be represented in the virtual dom,
   * becayse they just return one parent element node. on events, rerender and diff child */
  child: VNode;
};

export type VNode =
  | {
      kind: VNodeKind.E;
      tag: TagName;
      key: string | number | undefined;
      props: Props;
      children: Array<VNode>;
    }
  | {
      kind: VNodeKind.T;
      props: {
        nodeValue: string;
      };
      key?: string;
    }
  | MachineVNode;

function createTextElement(text: string): VNode {
  return {
    kind: VNodeKind.T,
    props: {
      nodeValue: text,
    },
  };
}

function processChildren(childrenArg: ChildrenArg): VNode[] {
  const children: VNode[] = [];
  let child: ChildArg;
  for (let i = 0; i < childrenArg.length; i++) {
    child = childrenArg[i];

    switch (typeof child) {
      case 'object':
        /** typeof null is object in js, so just check for truthiness */
        child && children.push(child);
        break;
      case 'string':
        children.push(createTextElement(child));
        break;
      case 'number':
        children.push(createTextElement(child.toString()));
        break;
    }
  }
  return children;
}

/** placeholder for null vnodes until i support null (it's an empty text node) */
const nullVNode: VNode = {
  kind: VNodeKind.T,
  props: {
    nodeValue: '',
  },
};

type TagType<Props extends PropsArg> =
  | SFC<Props>
  | MachineComponent<Props>
  | TagName;

/** createElement */
export function b<Props extends PropsArg>(
  type: TagType<Props>,
  /** I call them props for everything, but they are really attributes for ELEMENT_NODEs */
  props: Props | null,
  // TODO: type props better!! don't allow null when the machine/component has typed props!
  ...children: ChildrenArg
): VNode {
  switch (typeof type) {
    /** HTML element */
    case 'string':
      return {
        kind: VNodeKind.E,
        key: props ? props.key : void 0,
        tag: type,
        props: props ? new Map(Object.entries(props)) : new Map(),
        // think.. should elements always have children? who would use an element without a child or test node, right?
        children: processChildren(children),
      };

    /** stateless functional component */
    case 'function':
      // functional components don't need keys/special vnode representation. optional children
      const vNode = type(
        props as Props,
        children.length ? processChildren(children) : null
      );
      return vNode ? vNode : nullVNode;

    /** machine, stateful! */
    case 'object':
      const mProps: Props = props || ({} as Props);
      const instanceId =
        typeof type.id === 'function' ? type.id(mProps) : type.id;
      let existingInstance = machineRegistry.get(instanceId);

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

        existingInstance = {
          id: instanceId,
          state: type.initialState,
          ctx: initialContext,
          spec: type,
        };
        machineRegistry.set(instanceId, existingInstance);
      }

      const child = type.render(
        existingInstance.state,
        existingInstance.ctx,
        processChildren(children)
      );

      const machineNode: VNode = {
        kind: VNodeKind.M,
        key: mProps.key,
        mInst: existingInstance,
        child: child ? child : nullVNode,
      };

      return machineNode;

    default:
      throw new TypeError('invalid element');
  }
}
