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
  machineDuty,
} from './machineRegistry';

let isTransitioning = false;

let currentRootComponent: MachineComponent | SFC;
let currentVRoot: VNode;
let $root: HTMLElement;

function transitionMachines(
  event: { type: string | number; [key: string]: any },
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
  event: { type: string | number; [key: string]: any },
  allEffects: Array<[Effect, MachineInstance]> = []
): void {
  // check if there is a catch all listener for this event (root-level "on")
  const rootOn = machineInstance.s.on;

  let i: number,
    l: number,
    t = event.type;

  if (rootOn) {
    /** check if this machine always listens to this eventType */
    const transitionHandler = rootOn[t];

    /**
     * NEXT TASK: refactoring to support shorthand string target
     *
     * - common logic btwn root handler and state handler.
     *    - if the whole handler is a string, go to next state and handle only onentry.
     * actually, if the handler is a string, the current state may still have a transition.
     *    - else, handle both onexit and onentry
     *
     * tbh, just add this logic to "take to next state"
     */

    if (
      transitionHandler &&
      (!transitionHandler.if || transitionHandler.if(machineInstance.x, event))
    ) {
      machinesThatTransitioned.set(machineInstance.id, machineInstance.v.h!);

      const effects = transitionHandler.do;

      if (effects)
        if (typeof effects === 'function')
          allEffects.push([effects, machineInstance]);
        else {
          i = 0;
          l = effects.length;
          while (i < l) allEffects.push([effects[i++], machineInstance]);
        }

      // take to next state if target
      if (transitionHandler.to)
        takeToNextState(
          transitionHandler.to,
          machineInstance,
          machineInstance.s.when[machineInstance.st],
          allEffects
        );
    }
  }

  /** check if the machine has a handler/behavior spec
   * for its current state (it has to if written in TS) */
  const stateHandler = machineInstance.s.when[machineInstance.st];

  /** for js users who may specify invalid states */
  /* istanbul ignore next */
  if (process.env.NODE_ENV !== 'production') {
    if (!stateHandler) {
      throw TypeError(
        `The specified state handler for '${machineInstance.st}' does not exist on ${machineInstance.id}`
      );
    }
  }

  if (stateHandler.on) {
    /** check if this machine listens to this eventType in its current state */
    const transitionHandler = stateHandler.on[t];

    if (
      transitionHandler &&
      (!transitionHandler.if || transitionHandler.if(machineInstance.x, event))
    ) {
      machinesThatTransitioned.set(machineInstance.id, machineInstance.v.h!);

      const targetState = transitionHandler.to;
      const effects = transitionHandler.do;

      if (targetState)
        takeToNextState(targetState, machineInstance, stateHandler, allEffects);

      if (effects)
        if (typeof effects === 'function')
          allEffects.push([effects, machineInstance]);
        else {
          i = 0;
          l = effects.length;
          while (i < l) allEffects.push([effects[i++], machineInstance]);
        }
    }
  }
}

type StateHandler = {
  on?: any;
  entry?: any;
  exit?: any;
};

function takeToNextState(
  targetState: string | DeriveTargetFunction<any, any>,
  machineInstance: MachineInstance,
  currentStateHandler: StateHandler,
  allEffects: Array<[Effect, MachineInstance]> = []
): void {
  // check for target function. standardized to string
  let stdTargetState: string;

  if (typeof targetState === 'function')
    stdTargetState = targetState(machineInstance.x, machineInstance.s);
  else stdTargetState = targetState;

  if (stdTargetState !== machineInstance.st) {
    // only do anything if targetState !== current machine instance state

    const nextStateHandler = machineInstance.s.when[stdTargetState];

    if (nextStateHandler) {
      machineInstance.st = stdTargetState;

      /**
       *
       * the pseudocode for the code below:
       *
       * machine.spec.states[oldState]?.exit()
       * machine.spec.states[target]?.entry()
       *
       * */

      currentStateHandler.exit &&
        allEffects.push([currentStateHandler.exit, machineInstance]);

      nextStateHandler.entry &&
        allEffects.push([nextStateHandler.entry, machineInstance]);

      machinesThatTransitioned.set(machineInstance.id, machineInstance.v.h!);
    } else {
      /** for js users who may specify invalid targets */
      /* istanbul ignore next */
      if (process.env.NODE_ENV !== 'production') {
        throw TypeError(
          `The specified target (${targetState}) for this transition (${machineInstance.st} => ${targetState}) does not exist on your ${machineInstance.id}`
        );
      }
    }
  }
}

export function emit(
  event: { type: string | number; [key: string]: any },
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
      machInst.v.c = vNode as VNode;
    }
  }
  machineDuty();
}

export function router<Props extends PropsArg = any>(
  routerSchema: RouterSchema<Props>,
  prefix = ''
): SFC<Props & { children?: any }> {
  /* istanbul ignore next */
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
    /* istanbul ignore next */
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
  currentVRoot = vNode;
  machineDuty();
}

window.onpopstate = newRoute;

function link(path: string, state: any = null): void {
  /* istanbul ignore next */
  if (process.env.NODE_ENV !== 'production') {
    if (typeof path !== 'string')
      throw new TypeError('link path must be a string');
  }

  history.pushState(state, '', path[0] === '/' ? path : `/${path}`);

  newRoute();
}

/** programmatic routing */
export function linkTo(path: string, state: any = null): void {
  /** wait for transitions/rerenders to complete. this logic is only in place because of the
   * possibility that a state transition could trigger a redirect. not really a good pattern,
   * but should be supported/behave in the expected manner.
   *
   * NOTE: this was originally `setTimeout`, but queuing a microtask prevents
   * the browser from rendering/painting twice for what is essentially one user event
   * 
   * TODO: make a small polyfill for queueMicrotask for older browsers
   *  */
  isTransitioning ? queueMicrotask(() => link(path, state)) : link(path, state);
}

/** link component */
export const Link: SFC<{
  to: string | { path: string; state: any };
  key?: string | number;
  onClick?: (e: JSX.TargetedEvent<HTMLAnchorElement, MouseEvent>) => void;
  target?: string;
  children?: any;
  ref?: (el: HTMLAnchorElement) => void;
}> = (props, children) => {
  const path = typeof props.to === 'string' ? props.to : props.to.path;

  const o = props.onClick,
    target = props.target;

  const onClickOverride = (
    e: JSX.TargetedEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    if (o) o(e);

    /**
     * conditions from:
     * https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/Link.js#L43
     *
     * behave like a normal anchor tag to open in new tabs etc.
     */
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      (!props.target || props.target === '_self') &&
      !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)
    ) {
      e.preventDefault();
      linkTo(path, typeof props.to === 'object' && props.to.state);
    }
  };

  return b(
    'a',
    { href: path, onClick: onClickOverride, target: target, key: props.key },
    children
  );
};

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
  machineDuty();

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
