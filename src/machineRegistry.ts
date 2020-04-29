import { MachineSpec } from './component';
import { MachineVNode } from './createElement';

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
};

export type MachineRegistry = Map<string, MachineInstance>;

export const machineRegistry: MachineRegistry = new Map();

/** for deleting old machines after diff. clear it after deletion (empty for next diff).
 * iterate over machine registry. check if each id is in this map. if not, delete it.
 * add the machines during "createElement" process, bc every machine node in the
 * new VTree HAS to go through it!
 * using map > set because map.has is blazing fast for some reason
 * */
export const machinesThatStillExist: Map<string, true> = new Map();

/** keep track of machines that transitioned in the latest cycle. used for
 * memoizing leaf machines (if the machine didn't transition, it can return
 * the memoized VNode). "dirty checking." reset after TODO FIGURE OUT WHEN */
export const machinesThatTransitioned: Map<string, true> = new Map();

/** call this immediately after diff ONLY, and only ONCE, or else you'll wipe all machines
 * purpose is to unmount machines that don't exist anymore, reset machines that transitioned,
 * and reset the map of 'machinesThatStillExist' */
export function diffMachines(): void {
  for (const [id, machInst] of machineRegistry) {
    if (!machinesThatStillExist.has(id)) {
      machInst.spec.onUnmount &&
        machInst.spec.onUnmount(machInst.ctx, machInst.state);

      machineRegistry.delete(id);
    }
  }
  machinesThatStillExist.clear();
  machinesThatTransitioned.clear();
}
