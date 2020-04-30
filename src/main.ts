/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderDOM } from './renderDOM';
import { VNode, b, PropsArg } from './createElement';
import { MachineComponent, SFC, Effect } from './component';
import { diff } from './diff';
import { RouTrie, Params } from './router';
import {
  machineRegistry,
  MachineInstance,
  machinesThatTransitioned,
  renderType,
} from './machineRegistry';

let isTransitioning = false;

let currentRootComponent: MachineComponent | SFC;
let currentVRoot: VNode;
let $root: HTMLElement;

/**
 *
 * @param event
 * @param target
 *
 * INTERNAL, do not export!
 *
 * TOOD: try to extract common logic btwn targeted and global events
 * into a function to save bytes!
 *
 */

function transitionMachines(
  event: { type: string; [key: string]: any },
  target = '*'
): void {
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

      machinesThatTransitioned.set(machineInstance.id, true);
    }

    /**
     * check if machines have transitioned. if so, rerender.
     *
     * decision: can make the optimization of only rendering 1 machine if only 1 machine
     * transitioned, but i'm choosing to make global events rerender from the root.
     *
     * after all, if the event has a target in mind, users should specify it.
     * globally emitted events should have predictable behavior
     * (useful for POJO global stores, because you know that
     * everything referencing the global store will be accurate)
     */
  }
}

export function emit(
  event: { type: string; [key: string]: any },
  target: string = '*'
): void {
  target === '*' ? (renderType.t = 'gb') : (renderType.t = 'tg');

  // if already transitioning, transition machines, but don't start render process
  // change renderType to global, as we can no longer be sure (TODO)
  if (isTransitioning) {
    renderType.t = 'gb';
    transitionMachines(event, target);
    return;
  }

  isTransitioning = true;

  transitionMachines(event, target);

  isTransitioning = false;

  /**
   * check how many machines have transitioned/performed effects.
   * if one, just rerender that machine. If multiple,
   * rerender the whole app (think of better ways).
   *
   * no-op if the event(s) led to no transitions/effects
   */
  if (machinesThatTransitioned.size === 0) return;

  if (renderType.t === 'tg') {
    /**
     * no need to iterate, thru mTT; if we reached this point,
     * we are pretty sure that the target was the only machine
     * that transitioned (no nested events, obv wasn't a global)
     */

    // for (const [k] of machinesThatTransitioned) {
    const machine = machineRegistry.get(target);
    if (machine) {
      // the product of the render function is the child 'machineVNode.c',
      //  not the machineVNode itself
      const vNode: VNode | null = machine.spec.render(
        machine.state,
        machine.ctx,
        machine.id,
        machine.c
      );

      diff(machine.vNode.c, vNode, null);
      machinesThatTransitioned.clear();
      machine.vNode.c = vNode as VNode;
    }
    // }
  } else {
    const vNode = b(currentRootComponent, {});

    if (vNode !== null) {
      diff(currentVRoot, vNode, null);
      machinesThatTransitioned.clear();
      currentVRoot = vNode;
    }
  }
}

export function createRouter<Props extends PropsArg = any>(
  routerSchema: RouterSchema<Props>,
  prefix = ''
): SFC<Props> {
  if (process.env.NODE_ENV !== 'production') {
    if (typeof prefix !== 'string') throw TypeError('prefix must be a string');
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
    return match && match.handler ? match.handler(match.params, props) : null;
  }

  return routerComp;
}

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

  renderType.t = 'rt';

  // rerender
  const vNode: VNode | null = b(currentRootComponent, {});

  if (vNode) {
    // diff(currentVRoot, vNode)($root);
    diff(currentVRoot, vNode, null);
    // diffMachines();
    currentVRoot = vNode;
  }
}

window.onpopstate = newRoute;

function link(path: string, state: any = null): void {
  if (process.env.NODE_ENV !== 'production') {
    if (typeof path !== 'string')
      throw new TypeError('link path must be a string');
  }

  history.pushState(state, '', path[0] === '/' ? path : `/${path}`);

  newRoute();
}

export function linkTo(path: string, state: any = null): void {
  /** wait for transitions/rerenders to complete. this logic is only in place because of the
   * possibility that a state transition could trigger a redirect. not really a good pattern,
   * but should be supported/behave in the expected manner. */
  isTransitioning ? setTimeout(() => link(path, state), 0) : link(path, state);
}

export function mount(
  rootComponent: MachineComponent | SFC,
  $target: HTMLElement
): HTMLElement {
  machineRegistry.clear();
  renderType.t = 'gb';
  const vNode: VNode | null = b(rootComponent, {});

  if (vNode) {
    $root = renderDOM(vNode) as HTMLElement;
    /**
     * used to be $target.replaceWith($root), but that isn't supported on some broswers released
     * as recently as 2016, so this method is good for now. just be sure to inform users to provide
     * a nice empty div for baahu to append to!
     */
    $target.appendChild($root);

    currentRootComponent = rootComponent;
    currentVRoot = vNode;
  }

  return $root;
}

export type RouterSchema<Props extends PropsArg = any> = {
  [path: string]: RouterCallback<Props>;
};

export type RouterCallback<Props extends PropsArg = any> = (
  params: Params,
  props: Props
) => VNode;
