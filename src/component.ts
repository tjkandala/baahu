import { VNode, PropsArg } from './createElement';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** STATELESS COMPONENTS
 *
 * receive props, compute values if needed, then return VNode.
 * purpose is to encapsulate rendering logic, enables reuse.
 */

export type SFC<Props extends PropsArg = any> = (
  props: Props,
  children: Array<VNode> | null
) => VNode | null;

function defaultCompare<Props extends PropsArg = any>(
  oldProps: Props,
  newProps: Props
): boolean {
  // https://jsperf.com/object-keys-vs-hasownproperty/55

  // also, getting Object.keys to check for
  // changed length is too slow, it wouldn't be an optimization

  if (process.env.NODE_ENV !== 'production') {
    if (typeof oldProps !== 'object' || typeof newProps !== 'object') {
      throw new TypeError('props must be an object');
    }
  }

  // TODO: Dev mode type errors
  for (const k in newProps) {
    if (newProps.hasOwnProperty(k)) {
      if (newProps[k] !== oldProps[k]) return false;
    }
  }

  return true;
}

/** memoizes an instance of the functional component.
 *
 *  READ: it only works
 * for one instance of a component. Correct usage of memoInstance involves
 * components like navbars/sidebars, which take props which don't change very often.
 *
 * You CAN use it with static "components" like footers, but you should probably
 * just use an element, e.g. `const footer = <div><p>my footer<p><div>` */
export function memoInstance<Props extends PropsArg = any>(
  component: SFC<Props>,
  compare: (oldProps: Props, newProps: Props) => boolean = defaultCompare
): SFC<Props> {
  let firstRender = true;
  let prevProps: Props | false = false;
  let cached: VNode | null = null;

  return (props: Props, children: Array<VNode> | null) => {
    // this condition will take care of primitives (null === null, string === string, etc),
    // so in compare() we know props are objects!
    if (props !== prevProps || firstRender || children) {
      let sameProps = false;
      if (prevProps) {
        sameProps = compare(prevProps, props);
      }
      if (!sameProps) {
        cached = component(props, children);

        // same props will have to be false on first render
        if (firstRender) {
          firstRender = false;
        }
      }
      prevProps = props;
    }
    return cached;
  };
}

/** MACHINE COMPONENTS */

// MAKING THE SPEC "CALLABLE" FOR TSX
export interface MachineComponent<
  Props extends PropsArg = any,
  StateSchema extends string = any,
  EventSchema extends Event = any,
  ContextSchema extends object = any
> {
  // the props arg will be thrown away, just keep it for type checking!
  (props: Props): MachineSpec<Props, StateSchema, EventSchema, ContextSchema>;
  // id differentiates this from SFC
  id: DeriveIdFunction<Props> | string;
}

/**
 * INTERNAL NOTES:
 *
 * had to wrap machineSpec in createMachine to support TSX! objects are not callable,
 * so they can't be the first argument for createElement in TSX. this method is basically
 * just as fast as using POJO machineSpec as the component because you only have to
 * call the wrapped function once on the first render. store the spec on the instance after.
 * can compare the id without calling it as the createMachine function stores it as a property
 * on the 'machine component' wrapper
 */

/**
 * Creates a machine based on behavior specification
 *
 * @param machineSpec Specification for how the machine should behave
 */
export function createMachine<
  Props extends PropsArg = any,
  StateSchema extends string = any,
  EventSchema extends Event = any,
  ContextSchema extends object = any
>(
  machineSpec: MachineSpec<Props, StateSchema, EventSchema, ContextSchema>
): MachineComponent<Props, StateSchema, EventSchema, ContextSchema> {
  function machineComponent() {
    return machineSpec;
  }

  machineComponent.id = machineSpec.id;

  return machineComponent;
}

export interface MachineSpec<
  Props extends PropsArg = any,
  StateSchema extends string = any,
  EventSchema extends Event = any,
  ContextSchema extends object = any
> {
  // config
  id: DeriveIdFunction<Props> | string;
  initialContext: DeriveContextFunction<Props, ContextSchema>;
  initialState: StateSchema;
  // defaulting isLeaf to false is good
  isLeaf?: boolean;
  // behavior
  onMount?: (context: ContextSchema) => void;
  onUnmount?: (context: ContextSchema, state: StateSchema) => void;
  states: Record<
    StateSchema,
    {
      on?: {
        [K in EventSchema['type']]?: {
          target?: StateSchema;
          effects?: Array<
            Effect<
              ContextSchema,
              K extends EventSchema['type']
                ? Extract<EventSchema, { type: K }>
                : Event
            >
          >;
          cond?: (
            context: ContextSchema,
            event: K extends EventSchema['type']
              ? Extract<EventSchema, { type: K }>
              : Event
          ) => boolean;
        };
      };
      onEntry?: Effect<ContextSchema, EventSchema>;
      onExit?: Effect<ContextSchema, EventSchema>;
    }
  >;
  // UI
  render(
    state: StateSchema,
    context: ContextSchema,
    /** the id of the machine. useful for emitting events to self */
    self: string,
    children: Array<VNode>
  ): VNode | null;
}

type DeriveIdFunction<Props extends PropsArg = any> = (props: Props) => string;
type DeriveContextFunction<
  Props extends PropsArg = any,
  ContextSchema extends object = any
> = (props: Props) => ContextSchema;

type Event = {
  type: string;
};

export type Effect<ContextSchema = any, E extends Event = any> = (
  context: ContextSchema,
  event: E,
  instanceID: string
) => void;

/** All events, including events not defined by user and user-defined events */
export type MechaEvent<AppEvent extends Event> = AppEvent | InternalEvent;

type InternalEvent =
  | { type: 'MOUNT' }
  | {
      type: 'NEW_ROUTE';
      location: {
        pathname: string;
        search: string;
        state: any;
      };
    };
