/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderDOM } from './renderDOM';
import { VNode, b, PropsArg, ChildArg, createTextVNode } from './createElement';
import {
  MachineComponent,
  SFC,
  Effect,
  DeriveTargetFunction,
} from './component';
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
  let i: number;
  let l: number;

  const allEffects: Array<[Effect, MachineInstance]> = [];

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

    if (machineInstance) transitionMachine(machineInstance, event, allEffects);
  } else {
    /** high-level logic for wildcard events; check every machine to
     * see if it listens to this event in its current state. */

    /** execute effects after transitions + onEntry + onExit.
     *  using an array of tuples instead of a map so that the
     *  same effect function can be used for multiple machine instances
     *
     * batch all effects for each event for executing so that all machines will
     * have transitioned before "nested"/"ping pong" events work as expected!
     *  */

    for (const [, machineInstance] of machineRegistry) {
      transitionMachine(machineInstance, event, allEffects);
    }
  }

  i = 0;
  l = allEffects.length;
  let machineInstance: MachineInstance;
  while (i < l) {
    machineInstance = allEffects[i][1];
    allEffects[i++][0](machineInstance.x, event, machineInstance.id);
  }
}

function transitionMachine(
  machineInstance: MachineInstance,
  event: { type: string; [key: string]: any },
  allEffects: Array<[Effect, MachineInstance]> = []
): void {
  // check if there is a catch all listener for this event (root-level "on")
  const rootOn = machineInstance.s.on;

  let i: number;
  let l: number;
  let t = event.type;

  if (rootOn) {
    /** check if this machine listens to this eventType */
    const rootHandler = rootOn[t];

    /**
     * NEXT TASK: refactoring to support shorthand string target
     *
     *
     */

    if (
      rootHandler &&
      (!rootHandler.cond || rootHandler.cond(machineInstance.x, event))
    ) {
      // add to machinesThatTransitioned.
      // this will allow machines to rerender on events even
      // if they don't do anything ("listen" to events).
      // the cond will still allow machines to NOT rerender (like a list of machines
      // of same type in which one machine cares about the event)
      machinesThatTransitioned.set(machineInstance.id, machineInstance.v.h!);

      const effects = rootHandler.effects;

      if (effects)
        if (typeof effects === 'function')
          effects(machineInstance.x, event, machineInstance.id);
        else {
          i = 0;
          l = effects.length;
          while (i < l) allEffects.push([effects[i++], machineInstance]);
        }

      // take to next state if target
      if (rootHandler.target)
        takeToNextState(
          rootHandler.target,
          machineInstance,
          rootHandler,
          allEffects
        );
    }
  }

  /** check if the machine has a handler/behavior spec
   * for its current state (it has to if written in TS) */
  const stateHandler = machineInstance.s.states[machineInstance.st];

  /** for js users who may specify invalid states */
  if (process.env.NODE_ENV !== 'production') {
    if (!stateHandler) {
      throw TypeError(
        `The specified state handler for '${machineInstance.st}' does not exist on ${machineInstance.id}`
      );
    }
  }

  if (stateHandler.on) {
    /** check if this machine listens to this eventType */
    const transitionHandler = stateHandler.on[t];

    if (transitionHandler) {
      machinesThatTransitioned.set(machineInstance.id, machineInstance.v.h!);

      const cond = transitionHandler.cond;

      if (!cond || cond(machineInstance.x, event)) {
        const targetState = transitionHandler.target;
        const effects = transitionHandler.effects;

        if (targetState)
          takeToNextState(
            targetState,
            machineInstance,
            stateHandler,
            allEffects
          );

        if (effects)
          if (typeof effects === 'function')
            effects(machineInstance.x, event, machineInstance.id);
          else {
            i = 0;
            l = effects.length;
            while (i < l) allEffects.push([effects[i++], machineInstance]);
          }
      }
    }
  }
}

// type StateHandler = {
//   on?: any;
//   onEntry?: any;
//   onExit?: any;
// };

function takeToNextState(
  targetState: string | DeriveTargetFunction<any, any>,
  machineInstance: MachineInstance,
  stateHandler: any,
  allEffects: Array<[Effect, MachineInstance]> = []
): void {
  // check for target function. standardized to string
  let stdTargetState: string;

  if (typeof targetState === 'function')
    stdTargetState = targetState(machineInstance.x, machineInstance.s);
  else stdTargetState = targetState;

  if (stdTargetState !== machineInstance.st) {
    // only do anything if targetState !== current machine instance state

    const nextStateHandler = machineInstance.s.states[stdTargetState];

    if (nextStateHandler) {
      machineInstance.st = stdTargetState;

      /**
       *
       * the pseudocode for the code below:
       *
       * machine.spec.states[oldState]?.onExit()
       * machine.spec.states[target]?.onEntry()
       *
       * */

      stateHandler.onExit &&
        allEffects.push([stateHandler.onExit, machineInstance]);

      nextStateHandler.onEntry &&
        allEffects.push([nextStateHandler.onEntry, machineInstance]);

      machinesThatTransitioned.set(machineInstance.id, machineInstance.v.h!);
    } else {
      /** for js users who may specify invalid targets */
      if (process.env.NODE_ENV !== 'production') {
        throw TypeError(
          `The specified target (${targetState}) for this transition (${machineInstance.st} => ${targetState}) does not exist on your ${machineInstance.id}`
        );
      }
    }
  }
}

export function emit(
  event: { type: string; [key: string]: any },
  target: string = '*'
): void {
  // make sure to set this for free 'memo' type optimizations for machines!
  renderType.t = 't';

  /**
   * if already transitioning, transition machines, but don't start render process.
   * */
  if (isTransitioning) {
    transitionMachines(event, target);
    return;
  }

  isTransitioning = true;

  transitionMachines(event, target);

  isTransitioning = false;

  /**
   * no rerenders if no machines transitioned. handle global
   * and targeted events in (almost) the same way
   */
  if (machinesThatTransitioned.size === 0) return;

  /** array of tuples [instanceId, nodeDepth] */
  const idNodeDepth: [string, number][] = [];

  for (const kv of machinesThatTransitioned) {
    idNodeDepth.push(kv);
  }

  let j = idNodeDepth.length;

  /** sort machines that transitioned in DESC order, iterate backwards,
   * so you render machines from top to bottom!
   * don't need to sort it if there's only one machine (e.g. targeted events)
   * */
  j > 1 && idNodeDepth.sort((a, b) => b[1] - a[1]);

  while (j--) {
    const machInst = machineRegistry.get(idNodeDepth[j][0]);
    // the machine instance may not exist anymore (if an ancestor node stopped rendering it, for example)
    if (machInst) {
      let vNode: VNode | null = machInst.s.render(
        machInst.st,
        machInst.x,
        machInst.id,
        machInst.c
      );

      // if (vNode == null) vNode = createTextVNode(''); save some bytes w/ short-circuit

      // machine.v.c.h! -> vnode.h -> node depth
      diff(machInst.v.c, vNode || createTextVNode(''), null, machInst.v.c.h!);
      machinesThatTransitioned.clear();
      machInst.v.c = vNode as VNode;
    }
  }
}

export function createRouter<Props extends PropsArg = any>(
  routerSchema: RouterSchema<Props>,
  prefix = ''
): SFC<Props & { children?: any }> {
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
      if (key[0] !== '*' && key[0] !== '/')
        throw SyntaxError('routes should begin with /');
    }

    myTrieRouter.i(`${prefix}${key === '/' ? '' : key}`, routerSchema[key]);
  }

  function routerComp(props: Props, children: ChildArg): VNode | null {
    const match = myTrieRouter.f(location.pathname);
    // checking for handler for js users. (h = handler, p = params/route params)
    return match && match.h ? match.h(match.p, props, children) : null;
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

  renderType.t = 'r';

  // rerender
  const vNode: VNode | null = b(currentRootComponent, {});

  diff(currentVRoot, vNode, $root, 0);
  machinesThatTransitioned.clear();
  currentVRoot = vNode;
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
  // have to render the whole tree on mount ofc, so making it behave like a route event works!
  renderType.t = 'r';
  const vNode: VNode = b(rootComponent, {});

  $root = renderDOM(vNode, 0) as HTMLElement;
  /**
   * used to be $target.replaceWith($root), but that isn't supported on some broswers released
   * as recently as 2016, so this method is good for now. just be sure to inform users to provide
   * a nice empty div for baahu to append to!
   */
  $target.appendChild($root);

  currentRootComponent = rootComponent;
  currentVRoot = vNode;
  machinesThatTransitioned.clear();

  return $root;
}

export type RouterSchema<Props extends PropsArg = any> = {
  [path: string]: RouterCallback<Props>;
};

export type RouterCallback<Props extends PropsArg = any> = (
  params: Params,
  props: Props,
  children: ChildArg
) => VNode;
