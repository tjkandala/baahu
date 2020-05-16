import { b, VNode, PropsArg } from './createElement';
import { renderDOM } from './renderDOM';
import { machineDuty } from './machineRegistry';

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

export interface MemoComponent<Props extends PropsArg = any> {
  // the props arg will be thrown away, just keep it for type checking!
  (props: Props): SFC<Props>;
  memo: boolean;
}

export function memo<Props>(sfc: SFC<Props>): MemoComponent<Props> {
  function memoComponent() {
    return sfc;
  }

  memoComponent.memo = true;

  return memoComponent;
}

/**
 * tradeoffs: wraps the component in a div (if it wasn't already loaded
 * when called). also, might only be appropriate for route-level code-splitting.
 * work on resuable lazy
 */
export function lazy<Props>(
  lazyComponent: () => Promise<{
    default: MachineComponent<Props> | SFC<Props> | MemoComponent<Props>;
  }>,
  fallback?: VNode,
  timeout?: number,
  onError?: VNode
): SFC<Props> {
  let cache:
    | SFC<Props>
    | MachineComponent<Props>
    | MemoComponent<Props>
    | null = null;
  let renderedFallback = false;
  let startedLoading = false;

  return (props, children) => {
    if (cache == null) {
      const root = b('div', null);

      if (!startedLoading) {
        fallback &&
          setTimeout(() => {
            if (!cache) {
              // const $fallback = renderDOM(fallback);
              renderDOM(fallback, root.h! + 1);
              if (root.d && fallback.d) {
                root.d.appendChild(fallback.d);
                root.c = [fallback];
                renderedFallback = true;
              }
            }
          }, timeout || 300);

        lazyComponent()
          .then(module => {
            cache = module.default;

            // append vnode
            const vNode = b(cache, props, children);

            root.c = [vNode];

            // append dom
            const $dom = renderDOM(vNode, root.h! + 1);

            // 2 ops instead of one (replace), but shorter code!
            renderedFallback && fallback && fallback.d && fallback.d.remove();
            root.d?.appendChild($dom);

            machineDuty();
          })
          .catch(() => {
            if (onError && root.d) {
              // append vnode
              root.c = [onError];
              // append dom
              const $dom = renderDOM(onError, root.h! + 1);

              renderedFallback && fallback && fallback.d && fallback.d.remove();
              root.d.appendChild($dom);
            }
          });
        startedLoading = true;
      }

      return root;
    } else {
      // have to wrap it in a div for faster diff (consistent node depth)
      return b('div', null, b(cache, props, children));
    }
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
 * Type argument order: Props, State, Events, Context
 *
 * @param machineSpec Specification for how the machine should behave
 */
export function machine<
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
  StateSchema extends string = string,
  EventSchema extends Event = any,
  ContextSchema extends object = any
> {
  // config
  id: DeriveIdFunction<Props> | string;
  context: DeriveContextFunction<Props, ContextSchema>;
  initial: StateSchema | DeriveInitialStateFunction<Props, StateSchema>;
  // behavior
  mount?: (context: ContextSchema) => void;
  unmount?: (context: ContextSchema, state: StateSchema) => void;
  // events for all states
  on?: {
    [K in EventSchema['type']]?: {
      to?: StateSchema | DeriveTargetFunction<ContextSchema, StateSchema>;
      do?:
        | Effect<
            ContextSchema,
            K extends EventSchema['type']
              ? Extract<EventSchema, { type: K }>
              : Event
          >
        | Array<
            Effect<
              ContextSchema,
              K extends EventSchema['type']
                ? Extract<EventSchema, { type: K }>
                : Event
            >
          >;
      if?: (
        context: ContextSchema,
        event: K extends EventSchema['type']
          ? Extract<EventSchema, { type: K }>
          : Event
      ) => boolean;
    };
  };
  // state specific behavior
  when: Record<
    StateSchema,
    {
      on?: {
        [K in EventSchema['type']]?: {
          to?: StateSchema | DeriveTargetFunction<ContextSchema, StateSchema>;
          do?:
            | Effect<
                ContextSchema,
                K extends EventSchema['type']
                  ? Extract<EventSchema, { type: K }>
                  : Event
              >
            | Array<
                Effect<
                  ContextSchema,
                  K extends EventSchema['type']
                    ? Extract<EventSchema, { type: K }>
                    : Event
                >
              >;
          if?: (
            context: ContextSchema,
            event: K extends EventSchema['type']
              ? Extract<EventSchema, { type: K }>
              : Event
          ) => boolean;
        };
      };
      entry?: Effect<ContextSchema, EventSchema>;
      exit?: Effect<ContextSchema, EventSchema>;
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

export type DeriveIdFunction<Props extends PropsArg = any> = (
  props: Props
) => string;

export type DeriveContextFunction<
  Props extends PropsArg = any,
  ContextSchema extends object = any
> = (props: Props) => ContextSchema;

export type DeriveInitialStateFunction<
  Props extends PropsArg = any,
  StateSchema extends string = string
> = (props: Props) => StateSchema;

export type DeriveTargetFunction<
  ContextSchema extends object = any,
  StateSchema extends string = string
> = (context: ContextSchema, currentState: StateSchema) => StateSchema;

type Event = {
  type: string | number;
};

export type Effect<ContextSchema = any, E extends Event = any> = (
  context: ContextSchema,
  event: E,
  self: string
) => void;

/** All events, including events not defined by user and user-defined events */
export type BaahuEvent<AppEvent extends Event> = AppEvent | InternalEvent;

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
