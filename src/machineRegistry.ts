import { MachineSpec } from './component';
import { MachineVNode } from './createElement';
import { VNode } from '.';

export type MachineInstance = {
  id: string;
  /** state */
  st: string;
  /** context */
  x: Record<string, any>;
  /**
   * spec:
   * the spec is the object created by developers. it describes how the machine instance,
   * which created by Baahu, should behave */
  s: MachineSpec;

  /** last rendered vnode, for memoization + component-level rendering */
  v: MachineVNode;

  /** children for rerendering (children don't rerender) */
  c: VNode[];
};

export type MachineRegistry = Map<string, MachineInstance>;

export const machineRegistry: MachineRegistry = new Map();

/** keep track of machines that transitioned in the latest cycle.
 *
 * value is nodeDepth
 *  */
export const machinesThatTransitioned: Map<string, number> = new Map();

/** store ids of machines instances that were just created
 * in order to call onMount after render. clear every cycle.
 *
 */
export const machinesThatMounted: Set<string> = new Set();

/**
 * call this after every render! will do the dirty work that
 * needs to be done:
 *
 * - mount new machines
 * - clear new machines
 * - clear mTT
 */
export function machineDuty() {
  for (const id of machinesThatMounted) {
    const mInst = machineRegistry.get(id);
    if (mInst) {
      const spec = mInst.s;

      spec.mount && spec.mount(mInst.x);

      const stateHandler = spec.when[mInst.st];

      /* istanbul ignore next */
      if (process.env.NODE_ENV !== 'production') {
        if (!stateHandler) {
          throw new TypeError(
            `Machine ${id} does not specify behavior for state: ${mInst.st}`
          );
        }
      }

      /** call onEntry for initial state */
      stateHandler.entry && stateHandler.entry(mInst.x, { type: 'MOUNT' }, id);
    }
  }
  machinesThatMounted.clear();
  machinesThatTransitioned.clear();
}

/**
 * before rendering, set this variable to the type of event
 *
 * t: targeted (events),
 * r: routing
 */

export const renderType: {
  t: 't' | 'r';
} = {
  t: 't',
};
