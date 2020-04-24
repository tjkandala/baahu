/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderDOM } from './renderDOM';
import { VNode, b, PropsArg } from './createElement';
import { MachineComponent, SFC, Effect } from './component';
import { diff } from './diff';
import { RouTrie, Params } from './router';
import {
  machineRegistry,
  MachineInstance,
  diffMachines,
  machinesThatTransitioned,
} from './machineRegistry';

/**
 * Creates a Baahu application instance
 */
export function baahu<
  AppEvent extends { type: string } = any,
  MachineList extends string = string
>(): AppInstance<AppEvent, MachineList> {
  let isTransitioning = false;

  let currentRootComponent: MachineComponent | SFC;
  let currentVRoot: VNode;
  let $root: HTMLElement | Text;

  /**
   *
   *  Routing API
   *
   *  process for route changes
   * - change the actual route, push state to browser. (omit this step for onpopstate)
   * - emit new_route event to machines
   * - rerender regardless of machine transitions; remember, routers are functional
   *
   * */
  function newRoute(): void {
    // can't use emit here because we have to force rerender! routers are functional components, not machines.
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    transitionMachines({
      type: 'NEW_ROUTE',
      location: {
        pathname: location.pathname,
        search: location.search,
        state: history.state,
      },
    });

    // rerender
    const vNode: VNode | null = b(currentRootComponent, {});

    if (vNode) {
      diff(currentVRoot, vNode)($root);
      diffMachines();
      currentVRoot = vNode;
    }
  }

  // JUST CHANGE THIS TO EMIT WTF

  window.onpopstate = newRoute;

  function link(path: string, state: any = null): void {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof path !== 'string')
        throw new TypeError('link path must be a string');
    }

    history.pushState(state, '', path[0] === '/' ? path : `/${path}`);

    newRoute();
  }

  /**
   *
   * @param event
   * @param target
   *
   * @returns transitions: the amount of state changes + effects caused by the event
   *
   */

  function transitionMachines(
    event: { type: string; [key: string]: any },
    target = '*'
  ): number {
    /** count of state transitions and effects triggered by the event.
     * if this variable stays at 0, we know we don't need to rerender! */
    let transitions = 0;

    const eventType = event.type;

    /**
     * logic for non-wildcard events (there is a named target)
     *
     * - find machine target
     * - it it exists, check if it has a spec/handler for its current state
     * - if so, add check if that spec/handler has a transition for the event
     * - it it does, check if cond resolves to true (or doesn't exist)
     * - if so, transition the machine to its next state and execute effects/effects
     */
    if (target !== '*') {
      const machineInstance = machineRegistry.get(target);

      if (machineInstance) {
        /** check if the machine has a handler/behavior spec
         * for its current state (it has to if written in TS) */
        const stateHandler = machineInstance.spec.states[machineInstance.state];

        /** for js users who may specify invalid states */
        if (process.env.NODE_ENV !== 'production') {
          if (!stateHandler) {
            throw TypeError(
              `The specified state handler for '${machineInstance.state}' does not exist on ${machineInstance.id}`
            );
          }
        }

        if (stateHandler.on) {
          /** check if this machine listens to this eventType */
          const transitionHandler = stateHandler.on[eventType];

          if (transitionHandler) {
            const cond = transitionHandler.cond;

            if (!cond || cond(machineInstance.ctx, event) === true) {
              const target = transitionHandler.target;
              const effects = transitionHandler.effects;

              if (effects) {
                for (let i = 0; i < effects.length; i++) {
                  effects[i](machineInstance.ctx, event, machineInstance.id);

                  transitions++;
                }
                machinesThatTransitioned.set(machineInstance.id, true);
              }

              if (target && target !== machineInstance.state) {
                /** make sure the machine can even go to the next state */
                const nextStateHandler = machineInstance.spec.states[target];

                if (nextStateHandler) {
                  machineInstance.state = target;

                  /**
                   *
                   * the pseudocode for the code below:
                   *
                   * machine.spec.states[oldState]?.onExit()
                   * machine.spec.states[target]?.onEntry()
                   *
                   * */

                  stateHandler.onExit &&
                    stateHandler.onExit(
                      machineInstance.ctx,
                      event,
                      machineInstance.id
                    );

                  nextStateHandler.onEntry &&
                    nextStateHandler.onEntry(
                      machineInstance.ctx,
                      event,
                      machineInstance.id
                    );

                  transitions++;
                  machinesThatTransitioned.set(machineInstance.id, true);
                } else {
                  /** for js users who may specify invalid targets */
                  if (process.env.NODE_ENV !== 'production') {
                    throw TypeError(
                      `The specified target (${target}) for this transition (${machineInstance.state} => ${target}) does not exist on ${machineInstance.id}`
                    );
                  }
                }
              }
            }
          }
        }
      }
    } else {
      /** high-level logic for wildcard events; check every machine to
       * see if it listens to this event in its current state. */

      /** execute effects after transitions + onEntry + onExit.
       *  using an array of tuples instead of a map so that the
       *  same effect function can be used for multiple machine instances */
      const effects: Array<[Effect, MachineInstance]> = [];

      for (const [, machineInstance] of machineRegistry) {
        /** check if this machine listens to this eventType */
        const stateHandler = machineInstance.spec.states[machineInstance.state];

        /** for js users who may specify invalid states */
        if (process.env.NODE_ENV !== 'production') {
          if (!stateHandler) {
            throw TypeError(
              `The specified state handler for '${machineInstance.state}' does not exist on ${machineInstance.id}`
            );
          }
        }

        if (stateHandler.on) {
          /** check if this machine listens to this eventType */
          const transitionHandler = stateHandler.on[eventType];

          if (transitionHandler) {
            const cond = transitionHandler.cond;

            if (!cond || cond(machineInstance.ctx, event) === true) {
              const target = stateHandler.on[eventType]?.target;

              /**
               * onMount and onUnmount are handled in createElement and diff. handle the
               * state transitions (onExit of old state, onEntry of new state, effect array) here!
               *
               * Perform transitions (moving from state -> state, onExit, onEntry) first,
               * then perform effects after all transitions + machines for this event!
               */

              stateHandler.on[eventType]?.effects?.forEach(effect => {
                effects.push([effect, machineInstance]);
                // machinesThatTransitioned.set(machineInstance.id, true);
              });

              if (target && target !== machineInstance.state) {
                /** make sure the machine can even go to the next state */
                const nextStateHandler = machineInstance.spec.states[target];

                if (nextStateHandler) {
                  machineInstance.state = target;

                  /**
                   *
                   * the pseudocode for the code below:
                   *
                   * machine.spec.states[oldState]?.onExit()
                   * machine.spec.states[target]?.onEntry()
                   *
                   * */

                  stateHandler.onExit &&
                    stateHandler.onExit(
                      machineInstance.ctx,
                      event,
                      machineInstance.id
                    );

                  nextStateHandler.onEntry &&
                    nextStateHandler.onEntry(
                      machineInstance.ctx,
                      event,
                      machineInstance.id
                    );

                  transitions++;
                  machinesThatTransitioned.set(machineInstance.id, true);
                } else {
                  /** for js users who may specify invalid targets */
                  if (process.env.NODE_ENV !== 'production') {
                    throw TypeError(
                      `The specified target (${target}) for this transition (${machineInstance.state} => ${target}) does not exist on your ${machineInstance.id}`
                    );
                  }
                }
              }
            }
          }
        }
      }

      let i: number;
      let effect: Effect<any, any>;
      let machineInstance: MachineInstance;
      for (i = 0; i < effects.length; i++) {
        effect = effects[i][0];
        machineInstance = effects[i][1];
        effect(machineInstance.ctx, event, machineInstance.id);

        transitions++;
        machinesThatTransitioned.set(machineInstance.id, true);
      }
    }

    return transitions;
  }

  function emit(
    event: AppEvent,
    target: LiteralUnion<MachineList> = '*'
  ): void {
    // if already transitioning, transition machines, but don't start render process
    if (isTransitioning) {
      transitionMachines(event, target);
      return;
    }

    isTransitioning = true;

    const transitions = transitionMachines(event, target);

    isTransitioning = false;
    if (transitions === 0) return;

    /** Construct a new Virtual Dom Tree based on the new state of machines
     * in the registry. If this point has been reached, that means some state
     * has (likely) changed since the last render.
     */

    /**
     * this is the call to createElement. at this point, machinesThatTransitioned has been populated.
     * the render will reflect the new state. leaf machines that are not in the map (benchmark it vs set)
     * will return their lastVNode. if the instance did update, render a newVNode, append it lo lastVNode, and return that!
     */
    const vNode: VNode | null = b(currentRootComponent, {});

    if (vNode) {
      diff(currentVRoot, vNode)($root);
      diffMachines();
      currentVRoot = vNode;
    }
  }

  return {
    mount(
      rootComponent: MachineComponent | SFC,
      $target: HTMLElement
    ): HTMLElement | Text {
      const vNode: VNode | null = b(rootComponent, {});

      if (vNode) {
        $root = renderDOM(vNode);
        $target.replaceWith($root);

        currentRootComponent = rootComponent;
        currentVRoot = vNode;
      }

      return $root;
    },
    emit: emit,
    linkTo(path: string, state: any = null): void {
      /** wait for transitions/rerenders to complete. this logic is only in place because of the
       * possibility that a state transition could trigger a redirect. not really a good pattern,
       * but should be supported/behave in the expected manner. */
      isTransitioning
        ? setTimeout(() => link(path, state), 0)
        : link(path, state);
    },
    createRouter<Props extends PropsArg = any>(
      routerSchema: {
        [path: string]: RouterCallback<Props>;
      },
      prefix = ''
    ): SFC<Props> {
      if (process.env.NODE_ENV !== 'production') {
        if (typeof prefix !== 'string')
          throw TypeError('prefix must be a string');
      }

      const myTrieRouter = new RouTrie<RouterCallback<any>>();

      prefix &&
        (prefix =
          prefix[prefix.length - 1] === '/'
            ? prefix.slice(0, prefix.length - 1)
            : prefix);

      for (const key in routerSchema) {
        if (process.env.NODE_ENV !== 'production') {
          if (key[0] !== '/') throw SyntaxError('routes should begin with /');
        }

        myTrieRouter.insert(
          `${prefix}${key === '/' ? '' : key}`,
          routerSchema[key]
        );
      }

      function routerComp(props: Props): VNode | null {
        const match = myTrieRouter.find(location.pathname);
        // checking for handler for js users
        return match && match.handler
          ? match.handler(match.params, props)
          : null;
      }

      return routerComp;
    },
  };
}

interface AppInstance<
  AppEvent extends { type: string } = any,
  MachineList extends string = string
> {
  mount: (
    rootComponent: MachineComponent | SFC,
    $target: HTMLElement
  ) => HTMLElement | Text;
  /**
   *
   * @param event The event you want to
   * @param target
   *
   *
   *
   */
  emit: (event: AppEvent, target?: LiteralUnion<MachineList>) => void;
  linkTo: (path: string, state?: any) => void;
  createRouter: <Props extends PropsArg = any>(
    routerSchema: {
      [path: string]: RouterCallback<Props>;
    },
    prefix?: string
  ) => SFC<Props>;
}

/** provides intellisense for provided string literal union, but also allows
 * arbitrary strings. This is helpful so users can provide an expected list
 * of machine names (will be 100% accurate when they use a finite amount of machines),
 * but still works with computed instance ids for resuable machines!
 *
 * https://github.com/microsoft/TypeScript/issues/29729#issuecomment-471566609
 */
type LiteralUnion<T extends U, U = string> = T | (U & { zz_IGNORE_ME?: never });

type RouterCallback<Props extends PropsArg = any> = (
  params: Params,
  props: Props
) => VNode;
