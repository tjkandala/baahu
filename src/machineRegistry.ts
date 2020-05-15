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
