import { MachineInstance } from './createElement';

export type MachineRegistry = Map<string, MachineInstance>;

export const machineRegistry: MachineRegistry = new Map();

/** for deleting old machines after diff. clear it after deletion (empty for next diff).
 * iterate over machine registry. check if each id is in this map. if not, delete it.
 * add the machines during "createElement" process, bc every machine node in the
 * new VTree HAS to go through it!
 * using map > set because map.has is blazing fast for some reason
 * */
export const machinesThatStillExist: Map<string, true> = new Map();

/** call this immediately after diff ONLY, and only ONCE, or else you'll wipe all machines */
export function diffMachines(): void {
  for (const [id, machInst] of machineRegistry) {
    if (!machinesThatStillExist.has(id)) {
      machInst.spec.onUnmount &&
        machInst.spec.onUnmount(machInst.ctx, machInst.state);

      machineRegistry.delete(id);
    }
  }
  machinesThatStillExist.clear();
}
