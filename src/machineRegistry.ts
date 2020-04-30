import { MachineSpec } from './component';
import { MachineVNode } from './createElement';
import { VNode } from '.';

export type MachineInstance = {
  id: string;
  state: string;
  ctx: object;

  isLeaf: boolean;
  /** the spec is the object created by developers. it describes how the machine instance,
   * which created by Baahu, should behave */
  spec: MachineSpec;

  /** last rendered vnode, for memoization + component-level rendering */
  vNode: MachineVNode;

  /** children for rerendering (children don't rerender) */
  c: VNode[];
};

export type MachineRegistry = Map<string, MachineInstance>;

export const machineRegistry: MachineRegistry = new Map();

/** keep track of machines that transitioned in the latest cycle. used for
 * memoizing leaf machines (if the machine didn't transition, it can return
 * the memoized VNode). "dirty checking." reset after TODO FIGURE OUT WHEN */
export const machinesThatTransitioned: Map<string, true> = new Map();

/**
 * before rendering, set this variable to the type of event
 *
 * tg: targeted,
 * gb: global,
 * rt: routing
 */

export let renderType: {
  t: 'tg' | 'gb' | 'rt';
} = {
  t: 'gb',
};
