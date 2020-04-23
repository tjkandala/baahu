import { VNode } from '../createElement';
import { PatchFunction, diff } from '.';
import { renderDOM } from '../renderDOM';

/**
 * Diffing algorithm for keyed children. Call this when the first
 * index of oldVChildren and newVChildren are both keyed.
 *
 * Inspired by the algorithm used in Ivi, but modified to account
 * for different patching process.
 *
 * References:
 * https://github.com/localvoid/ivi/blob/master/packages/ivi/src/vdom/reconciler.ts#L581
 * https://github.com/yelouafi/petit-dom/blob/master/src/vdom.js#L240
 * https://neil.fraser.name/writing/diff/
 */
export function keyedDiffChildren(
  oldVChildren: VNode[],
  newVChildren: VNode[]
): PatchFunction {
  return ($parent: HTMLElement | Text): HTMLElement | Text => {
    const childNodes = Array.from($parent.childNodes);

    /**
     * Common prefix and suffix optimization.
     * Iterate over old children and new children simultaneously from both sides,
     * patching nodes in place when keys are equal.
     */
    let oldStart = 0;
    let newStart = 0;
    let oldEnd = oldVChildren.length - 1;
    let newEnd = newVChildren.length - 1;

    let $node: HTMLElement | Text | ChildNode | undefined;
    let $nextNode: HTMLElement | Text | ChildNode | undefined = undefined;

    outer: while (true) {
      // check common suffix
      let oldEndNode = oldVChildren[oldEnd];
      let newEndNode = newVChildren[newEnd];

      while (oldEndNode.key === newEndNode.key) {
        // this part is important: if the last node not part of the
        // common suffix is new, it needs a reference to the leftmost
        // member of the common suffix so it can be appended before it
        $nextNode = childNodes[oldEnd];

        diff(oldEndNode, newEndNode)($nextNode as HTMLElement | Text);

        oldEnd--;
        newEnd--;
        oldEndNode = oldVChildren[oldEnd];
        newEndNode = newVChildren[newEnd];

        if (oldStart > oldEnd || newStart > newEnd) break outer;
      }

      // exhausted common suffix

      // check common prefix
      let oldStartNode = oldVChildren[oldStart];
      let newStartNode = newVChildren[newStart];

      while (oldStartNode.key === newStartNode.key) {
        diff(
          oldStartNode,
          newStartNode
        )(childNodes[oldStart] as HTMLElement | Text);

        oldStart++;
        newStart++;
        oldStartNode = oldVChildren[oldStart];
        newStartNode = newVChildren[newStart];

        if (oldStart > oldEnd || newStart > newEnd) break outer;
      }

      // exhausted common prefix

      break outer;
    }

    /** if either the old children list or new children list
     * is empty after common prefix/suffix diffing, then either
     * delete the remaining nodes (if new list is empty), or
     * add the remaining nodes (if old list is empty)
     */
    if (oldStart > oldEnd) {
      /** if the start pointer is greater than the oldEnd pointer,
       * then all of the nodes in the old children list have been patched.
       * Iterate through the new list and mount the leftovers in between
       * the nodes at oldStart and oldEnd.
       *
       * RenderDOM all nodes from newStart to newEnd, insert them before node
       * at oldStart
       */

      while (newStart <= newEnd) {
        $parent.insertBefore(
          renderDOM(newVChildren[newStart]),
          childNodes[oldStart]
        );
        newStart++;
      }
      return $parent;
    }

    if (newStart > newEnd) {
      /**
       * if the start pointer is greater than the newEnd pointer,
       * then all of the nodes in the new children list have been patched.
       * Iterate through the old list and delete the leftovers.
       *
       * Delete all nodes from oldStart to oldEnd
       */

      while (oldStart <= oldEnd) {
        childNodes[oldStart].remove();
        oldStart++;
      }

      return $parent;
    }

    let newChildrenLeft = newEnd - newStart + 1;
    const sources = new Int32Array(newChildrenLeft);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keyIndex = new Map<any, number>();

    /** Iterate over remaining newChildren (left to right),
     * storing each child's pos/index (in the new array) by its key
     * in the 'keyIndex' map. At the same time, fill the 'sources' array
     * with '-1', meaning new node that needs to be mounted. If the node
     * existed in the oldChildren list, '-1' will be replaced with its position
     * in the oldChildren list!
     */
    for (let i = 0; i < newChildrenLeft; i++) {
      // newStart is offset between 'sources' and actual new children array
      const indexInNewChildren = i + newStart;
      sources[i] = -1;
      keyIndex.set(newVChildren[indexInNewChildren].key, indexInNewChildren);
    }

    let indexInOldChildren: number;
    let indexInNewChildren: number | undefined;
    let ogNode: ChildNode;
    let pos = -1;

    let oldVNode: VNode;
    let newVNode: VNode;

    /** -2 for patch in place, -1 for mount, any other value for move */
    let actionAtIndex: number;

    /**
     * Check if old children (that weren't part of common
     * prefix/suffix) are in the new list (using key index)
     */
    for (let i = oldStart; i <= oldEnd; i++) {
      oldVNode = oldVChildren[i];
      indexInNewChildren = keyIndex.get(oldVNode.key);
      ogNode = childNodes[i];
      if (typeof indexInNewChildren !== 'undefined') {
        /** 99999999 indicates that at least one node has moved,
         * so we should mark nodes that are part of the longest increasing
         * subsequence to minimize DOM moves.
         *
         * Set pos to 99999999 when the new position of a node is less
         * than the new position of the node that used to precede it */

        pos = pos < indexInNewChildren ? indexInNewChildren : 99999999;
        sources[indexInNewChildren - newStart] = i;
      } else {
        if (ogNode !== null) {
          ogNode.remove();
        }
      }
    }

    /**
     * Iterate over the remaining newChildren (right to left),
     * and perform the action corresponding to the value
     * in the array at index
     *
     * $nextNode should be the last node (from the right)
     * in the common suffix. If there is no $nextNode yet, this is
     * the next last child!
     */

    let sourcesActions: Int32Array;

    // slightly different logic if nodes have moved
    if (pos === 99999999) {
      // at least one node has moved
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      sourcesActions = markLIS(sources);

      while (newChildrenLeft > 0) {
        newChildrenLeft--;

        newEnd = newChildrenLeft + newStart;
        newVNode = newVChildren[newEnd];
        /** will have to use the LIS marked array to find
         * actionAtIndex to preserve indexInOldChildren
         * (using OG sources array)! */
        actionAtIndex = sourcesActions[newChildrenLeft];
        switch (actionAtIndex) {
          case -2:
            // existing node, but not moved. that's why you should
            // check sources (sourcesActions obv has -2 here)
            indexInOldChildren = sources[newChildrenLeft];

            oldVNode = oldVChildren[indexInOldChildren];
            $node = childNodes[indexInOldChildren];

            $node = diff(oldVNode, newVNode)($node as HTMLElement | Text);

            if ($node) {
              $nextNode = $node;
            }

            continue;

          case -1:
            // new node
            $node = renderDOM(newVNode);

            $nextNode
              ? $parent.insertBefore($node, $nextNode)
              : $parent.appendChild($node);

            $nextNode = $node;
            continue;

          default:
            // diff, patch, then move node before $nextNode
            indexInOldChildren = sources[newChildrenLeft];

            oldVNode = oldVChildren[indexInOldChildren];
            $node = childNodes[indexInOldChildren];

            $node = diff(oldVNode, newVNode)($node as HTMLElement | Text);

            if ($node) {
              $nextNode
                ? $parent.insertBefore($node, $nextNode)
                : $parent.appendChild($node);

              $nextNode = $node;
            }

            continue;
        }
      }
    } else {
      while (newChildrenLeft > 0) {
        newChildrenLeft--;

        newEnd = newChildrenLeft + newStart;
        newVNode = newVChildren[newEnd];

        /** will have to use the LIS marked array to find
         * actionAtIndex to preserve indexInOldChildren
         * (using OG sources array)! */

        actionAtIndex = sources[newChildrenLeft];
        switch (actionAtIndex) {
          case -1:
            // new node
            $node = renderDOM(newVNode);

            $nextNode
              ? $parent.insertBefore($node, $nextNode)
              : $parent.appendChild($node);

            $nextNode = $node;
            continue;

          default:
            /** diff, patch. no need to move in this branch, but
             * still set as $nextNode for the sake of new nodes */

            indexInOldChildren = sources[newChildrenLeft];

            oldVNode = oldVChildren[indexInOldChildren];
            $node = childNodes[indexInOldChildren];

            $node = diff(oldVNode, newVNode)($node as HTMLElement | Text);

            if ($node) {
              $nextNode = $node;
            }

            continue;
        }
      }
    }
    return $parent;
  };
}

/**
 * Returns an array that is a copy of the input array, but values that are a part
 * of the longest increasing subsequence are replaced with -2
 *
 * References:
 * https://github.com/localvoid/ivi/blob/master/packages/ivi/src/vdom/reconciler.ts#L935
 * https://en.wikipedia.org/wiki/Longest_increasing_subsequence
 *
 * Differs from the algorithm in ivi in that it returns a new array. I do not
 * touch the original sources array because I need the
 * index i of an existing node for patches to childNode[i]), even if the
 * node is part of the longest increasing subsequence.
 *
 *
 * Doesn't work correctly if source array values are -1 or -2,
 * but that's irrelevant here because the values represent indices (min 0)
 */
export function markLIS(sources: Int32Array): Int32Array {
  const n = sources.length;
  /** The value at each index i is the index (in the sources array)
   * of the immediate predecessor in the longest increasing subsequence that ends with sources[i].
   * i.e. sources[predecessors[i]] directly precedes sources[i] in an increasing subsequence  */
  const predecessors = new Int32Array(n);
  /** Length is n + 1 bc we skip index 0.
   * The value at each index i is the index in sources array of the
   * (smallest) last member of an increasing subsequence of length i
   */
  const indices = new Int32Array(n + 1);

  let length = 0;
  let lo: number;
  let hi: number;
  let mid: number;
  let newLength: number;
  let i: number;

  for (i = 0; i < n; i++) {
    const num = sources[i];
    /** Ignore -1 values, meaning new node. If you
     * forget this step, and -1 happens to be part of the LIS,
     * then you turn -1 into -2. The reconciler will look
     * for a node (that might not exist in newVChildren)
     * at this position in oldVChildren, as -2 is supposed to
     * signal that the node hasn't moved
     */
    if (num !== -1) {
      lo = 1;
      hi = length;
      while (lo <= hi) {
        // mid = Math.floor((lo + hi) / 2);
        mid = ((lo + hi) / 2) | 0;
        if (sources[indices[mid]] < num) lo = mid + 1;
        else hi = mid - 1;
      }
      newLength = lo;
      predecessors[i] = indices[newLength - 1];
      indices[newLength] = i;
      length = Math.max(length, newLength);
    }
  }

  // backtracking to mark lis a copy of the sources array
  const markedLIS = Int32Array.from(sources);
  let k = indices[length];
  for (i = 0; i < length; i++) {
    markedLIS[k] = -2;
    k = predecessors[k];
  }

  return markedLIS;
}

/**
 * Diffing algorithm for non-keyed children. Call this when the first
 * index of oldVChildren and newVChildren are not both keyed.
 *
 * The indices of the children act as 'implicit keys.' Compare nodes
 * in oldVChildren to nodes in newVChildren and diff/patch in place.
 *
 * Keep track of machine instance ids in maps so as to not unmount
 * them in case of reordering. New instances have already been mounted
 * in 'createElement,' so only take care of unmounting here.
 *
 * This algorithm is slightly faster than the keyed diff, but it may lead
 * to unexpected CSS behavior if you are reordering lists.
 * More info: https://www.stefankrause.net/wp/?p=342
 * If you know that what you are doing will not cause problems (pls read
 * the link above), and you need max performance, you can omit keys from lists.
 * */
export function diffChildren(
  oldVChildren: VNode[],
  newVChildren: VNode[]
): PatchFunction {
  return ($parent: HTMLElement | Text): HTMLElement | Text => {
    /** These patches will be applied to existing children */
    const childPatches: Array<PatchFunction> = [];
    /** These patches will be applied to new/additional children */
    const additionalPatches: Array<PatchFunction> = [];

    let i = 0;
    const len = oldVChildren.length;
    let newLen = newVChildren.length;

    /** PUSH PATCHES */
    /** This will automatically delete removed children, bc newVChildren[i] will be undefined */
    for (; i < len; i++) {
      childPatches.push(diff(oldVChildren[i], newVChildren[i]));
    }

    /** This will only be executed if newVChildren is longer than oldVChildren */
    for (; i < newLen; i++) {
      // this variable has to be here (closure problem with i if code golfing it in patch)
      const $new = renderDOM(newVChildren[i]);

      additionalPatches.push($el => {
        $el.appendChild($new);
        return $el;
      });
    }

    /** EXECUTE PATCHES */
    // use Array.from() to convert from a live collection of child node to a static array.
    const childNodes = Array.from($parent.childNodes);

    for (i = 0; i < len; i++) {
      // not checking for existence, bc for each node of childNodes, there has to be a patch
      childPatches[i](childNodes[i] as HTMLElement | Text);
    }

    // for additional children, you are appending them to the parent, so you can apply the patch directly to parent
    for (i = 0; i < additionalPatches.length; i++) {
      additionalPatches[i]($parent);
    }

    return $parent;
  };
}