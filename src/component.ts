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

/** MACHINE COMPONENTS */

export interface MachineComponent<
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
  render?(
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
