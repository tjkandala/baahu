import { VNode, VNodeKind, PropsArg } from '../createElement';
import { renderDOM } from '../renderDOM';
import { diffProps } from './props';
import { b } from '../createElement';
import { renderType, machineRegistry } from '../machineRegistry';

export function diff(
  oldVNode: VNode,
  newVNode: VNode | undefined | null,
  parentDom: HTMLElement | null,
  nodeDepth: number,
  isSvg: boolean
): void {
  /** for machines not targeted, isLeaf, memo, static elements!
   * don't need to pass on dom (test it), same vnode. == for null/undefined
   */
  if (oldVNode == newVNode) return;

  /** there is no node in the new tree corresponding
   * to the old tree, so remove node */
  if (!newVNode) {
    if (oldVNode.x === VNodeKind.Machine) {
      oldVNode.c.d && oldVNode.c.d.remove();
    } else {
      oldVNode.d && oldVNode.d.remove();
    }
    safelyRemoveVNode(oldVNode);
    return;
  }

  // you can't exit the svg namespace, so the logic is simple.
  // once you've reached an svg node, it and all of its descendants
  // must be created with createElementNS()
  isSvg = newVNode.t === 'svg' || isSvg;

  newVNode.h = nodeDepth;

  switch (oldVNode.x) {
    case VNodeKind.Element:
      switch (newVNode.x) {
        case VNodeKind.Element:
          if (oldVNode.t !== newVNode.t) {
            /** different tags can't represent the same node */
            return replace(oldVNode, newVNode, parentDom, nodeDepth, isSvg);
          } else {
            /** most computation is done here. Both VNodes are ELEMENT_NODES and
             * have the same tag, so we must diff props (attributes) and children */

            diffProps(oldVNode.a, newVNode.a, oldVNode.d as HTMLElement);

            /** only call diffKeyedChildren if the first nodes of both lists are keyed.
             * users should be aware of this behavior, and be sure to either key all
             * children or no children. this shortcut saves many iterations over children lists.
             *
             * if either of the arrays have 0 elements, only use diffChildren (faster anyways)
             *
             * most of the time, call diffChildren */

            const firstOldChild = oldVNode.c[0];
            const firstNewChild = newVNode.c[0];

            if (
              firstOldChild &&
              firstOldChild.k != null &&
              firstNewChild &&
              firstNewChild.k != null
            ) {
              keyedDiffChildren(
                oldVNode.c,
                newVNode.c,
                // asserting the type bc it'll only be null after
                // createElement and before renderDOM. can't be null at diff
                oldVNode.d as HTMLElement,
                nodeDepth,
                isSvg
              );
            } else {
              diffChildren(
                oldVNode.c,
                newVNode.c,
                oldVNode.d as HTMLElement,
                nodeDepth,
                isSvg
              );
            }

            // pass on the dom node since they are the same element
            newVNode.d = oldVNode.d;

            return;
          }

        default:
          return replace(oldVNode, newVNode, parentDom, nodeDepth, isSvg);
      }

    case VNodeKind.Text:
      switch (newVNode.x) {
        case VNodeKind.Text:
          if (oldVNode.a.n === newVNode.a.n) newVNode.d = oldVNode.d;
          else {
            oldVNode.d && (oldVNode.d.nodeValue = newVNode.a.n);
            newVNode.d = oldVNode.d;
          }
          return;

        default:
          return replace(oldVNode, newVNode, parentDom, nodeDepth, isSvg);
      }

    case VNodeKind.Machine:
      switch (newVNode.x) {
        case VNodeKind.Machine:
          oldVNode.i !== newVNode.i && unmountMachine(oldVNode.i);

          // "children" of a machineVNode is one child
          diff(oldVNode.c, newVNode.c, parentDom, nodeDepth + 1, isSvg);
          newVNode.d = newVNode.c.d;
          return;

        default:
          return replace(oldVNode.c, newVNode, parentDom, nodeDepth, isSvg);
      }

    /**
     * lazy/memo nodes can't be roots. this will make it easier to create dynamic import fn
     * without wrapping in a div. just store parent dom on the lazy node. when fallback timeout
     * or import comes in, replace the placeholder text node using parent.replaceChild(import/fallback, placeholder)
     */
    case VNodeKind.Memo:
      switch (newVNode.x) {
        case VNodeKind.Memo:
          /**
           * all the reasons that a memo component should rerender:
           * - the functions are different.
           * -
           *
           * note, the props object itself will most likely be new on each render, so
           * that's not a useful check. nvm,, null === null is a good opt!
           */

          if (renderType.t === 'r') {
            // it already rendered on route change
            diff(oldVNode.c, newVNode.c, parentDom, nodeDepth + 1, isSvg);
            newVNode.d = newVNode.c.d;
          } else if (
            oldVNode.t !== newVNode.t ||
            shouldRender(oldVNode.a, newVNode.a)
          ) {
            // rerender (create new vnode child)
            // memo ignores children. it wouldn't work with children anyways
            const vNode = b(newVNode.t, newVNode.a);
            newVNode.c = vNode;
            // diff
            diff(oldVNode.c, newVNode.c, parentDom, nodeDepth + 1, isSvg);
            newVNode.d = newVNode.c.d;
          } else {
            // don't render. pass on the child.
            newVNode.c = oldVNode.c;
            newVNode.d = oldVNode.d;
          }
          return;

        default:
          return replace(oldVNode.c, newVNode, parentDom, nodeDepth, isSvg);
      }
  }
}

function replace(
  oldVNode: VNode,
  newVNode: VNode,
  parentDom: HTMLElement | null,
  nodeDepth: number,
  isSvg: boolean
): void {
  /**
   * what about replacing an element/text node with a machine?
   *
   * this works because renderDOM will return the dom node
   * of the child of the machine node
   *
   * what about replacing a machine with an element/text node?
   *
   * this works because when the oldVNode is a machine node,
   * replace is called with the child of oldVNode
   */

  const $new = renderDOM(newVNode, nodeDepth, isSvg);
  if (parentDom) {
    // replaceWith isn't supported on old browsers
    // if (!oldVNode.d) {
    //   // this might be an unneccesary test, check it. just make sure every node has to have a valid .d at diff time
    //   parentDom.appendChild($new);
    // } else {
    parentDom.replaceChild($new, oldVNode.d as HTMLElement);
    // }
  } else {
    // this is convoluted try to golf it
    const $d = oldVNode.d;
    if ($d) {
      const $parent = $d.parentElement;
      $parent && $parent.replaceChild($new, $d);
    }
  }
  safelyRemoveVNode(oldVNode);
}

/**
 * if this returns true, rerender the memo component
 */
export function shouldRender<Props extends PropsArg = any>(
  oldProps: Props | null | undefined,
  newProps: Props | null | undefined
): boolean {
  // for when they they are both null or undefined, no point in rerendering. it's basically a static vnode/element
  if (oldProps == newProps) return false;
  if (newProps && oldProps) {
    for (let i in oldProps) if (!(i in newProps)) return true;
    for (let i in newProps) if (oldProps[i] !== newProps[i]) return true;
  } else {
    // one of new/old props don't exist, but the other do. have to rerender
    return true;
  }
  // this means both newProps and oldProps exist, but they are shallow equal
  return false;
}

/** traverses the VNode to be removed in order to
 * remove any machine instances that may be a descendant
 * of this node */
function safelyRemoveVNode(node: VNode) {
  switch (node.x) {
    case VNodeKind.Machine: {
      // we found a machine to unmount
      unmountMachine(node.i);
      // keep looking for machine desc.
      safelyRemoveVNode(node.c);
      return;
    }

    case VNodeKind.Element: {
      // keep looking for machine desc.
      let i = node.c.length;
      while (i--) safelyRemoveVNode(node.c[i]);
      return;
    }

    default:
      // do nothing, text/undefined can't have a machine desc.
      return;
  }
}

function unmountMachine(idToDelete: string) {
  const mInst = machineRegistry.get(idToDelete);

  if (mInst) {
    mInst.s.onUnmount && mInst.s.onUnmount(mInst.ctx, mInst.st);

    machineRegistry.delete(idToDelete);
  }
}

/**
 *
 * DIFF CHILDREN (KEYED + UNKEYED)
 *
 */

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
function keyedDiffChildren(
  oldVChildren: VNode[],
  newVChildren: VNode[],
  parentDom: HTMLElement,
  nodeDepth: number,
  isSvg: boolean
): undefined {
  /**
   * Common prefix and suffix optimization.
   * Iterate over old children and new children simultaneously from both sides,
   * patching nodes in place when keys are equal.
   */
  let oldStart = 0;
  let newStart = 0;

  let oldLen = oldVChildren.length;

  let oldEnd = oldLen - 1;
  let newEnd = newVChildren.length - 1;

  let $node: HTMLElement | Text | ChildNode | undefined;
  let $nextNode: HTMLElement | Text | ChildNode | null | undefined = undefined;

  let oldVNode: VNode;
  let newVNode: VNode;

  outer: while (true) {
    // check common suffix
    let oldEndNode = oldVChildren[oldEnd];
    let newEndNode = newVChildren[newEnd];

    while (oldEndNode.k === newEndNode.k) {
      // this part is important: if the last node not part of the
      // common suffix is new, it needs a reference to the leftmost
      // member of the common suffix so it can be appended before it

      $nextNode = oldEndNode.d;

      diff(oldEndNode, newEndNode, parentDom, nodeDepth + 1, isSvg);

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

    while (oldStartNode.k === newStartNode.k) {
      diff(oldStartNode, newStartNode, parentDom, nodeDepth + 1, isSvg);

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
      $node = renderDOM(newVChildren[newStart], nodeDepth + 1, isSvg);

      oldStart >= oldLen
        ? parentDom.appendChild($node)
        : parentDom.insertBefore($node, oldVChildren[oldStart].d);

      newStart++;
    }
    return;
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
      oldVNode = oldVChildren[oldStart];

      oldVNode.x === VNodeKind.Machine
        ? oldVNode.c.d!.remove()
        : oldVNode.d!.remove();
      // we can assert that dom exists because it is only null before "renderDOM",
      // which surely would have been run before diffing

      safelyRemoveVNode(oldVChildren[oldStart]);

      oldStart++;
    }

    return;
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
    keyIndex.set(newVChildren[indexInNewChildren].k, indexInNewChildren);
  }

  let indexInOldChildren: number;
  let indexInNewChildren: number | undefined;
  let pos = -1;

  /** -2 for patch in place, -1 for mount, any other value for move */
  let actionAtIndex: number;

  /**
   * Check if old children (that weren't part of common
   * prefix/suffix) are in the new list (using key index)
   */
  for (let i = oldStart; i <= oldEnd; i++) {
    oldVNode = oldVChildren[i];
    indexInNewChildren = keyIndex.get(oldVNode.k);
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
      oldVNode.x === VNodeKind.Machine
        ? oldVNode.c.d!.remove()
        : oldVNode.d!.remove();
      // we can assert that dom exists because it is only null before "renderDOM",
      // which surely would have been run before diffing

      safelyRemoveVNode(oldVNode);
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

          diff(oldVNode, newVNode, parentDom, nodeDepth + 1, isSvg);

          if (newVNode.d) $nextNode = newVNode.d;

          continue;

        case -1:
          // new node. this works for machine nodes as
          // well because renderDOM returns child
          $node = renderDOM(newVNode, nodeDepth + 1, isSvg);

          $nextNode
            ? parentDom.insertBefore($node, $nextNode)
            : parentDom.appendChild($node);

          $nextNode = $node;
          continue;

        default:
          // diff, patch, then move node before $nextNode
          indexInOldChildren = sources[newChildrenLeft];

          oldVNode = oldVChildren[indexInOldChildren];

          diff(oldVNode, newVNode, parentDom, nodeDepth + 1, isSvg);

          if (newVNode.d) {
            $nextNode
              ? parentDom.insertBefore(newVNode.d, $nextNode)
              : parentDom.appendChild(newVNode.d);

            $nextNode = newVNode.d;
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
          // new node. this works for machine nodes as
          // well because renderDOM returns child
          $node = renderDOM(newVNode, nodeDepth + 1, isSvg);

          $nextNode
            ? parentDom.insertBefore($node, $nextNode)
            : parentDom.appendChild($node);

          $nextNode = $node;
          continue;

        default:
          /** diff, patch. no need to move in this branch, but
           * still set as $nextNode for the sake of new nodes */

          indexInOldChildren = sources[newChildrenLeft];

          oldVNode = oldVChildren[indexInOldChildren];

          diff(oldVNode, newVNode, parentDom, nodeDepth + 1, isSvg);

          if (newVNode.d) $nextNode = newVNode.d;

          continue;
      }
    }
  }
  return;
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
 * Diffing "algorithm" for non-keyed children. Call this when the first
 * index of oldVChildren and newVChildren are not both keyed.
 *
 * The indices of the children act as 'implicit keys.' Compare nodes
 * in oldVChildren to nodes in newVChildren and diff/patch in place.
 *
 * This algorithm is slightly faster than the keyed diff, but it may lead
 * to unexpected CSS behavior if you are reordering lists.
 * More info: https://www.stefankrause.net/wp/?p=342
 * If you know that what you are doing will not cause problems (pls read
 * the link above), and you need max performance, you can omit keys from lists.
 * */
function diffChildren(
  oldVChildren: VNode[],
  newVChildren: VNode[],
  parentDom: HTMLElement,
  nodeDepth: number,
  isSvg: boolean
): void {
  let i = 0;
  const len = oldVChildren.length;
  let newLen = newVChildren.length;

  let oldVChild: VNode;
  let newVChild: VNode;

  /** This will automatically delete removed children, bc newVChildren[i] will be undefined */
  for (; i < len; i++) {
    oldVChild = oldVChildren[i];
    newVChild = newVChildren[i];
    // this will remove dom node if no newVChild
    diff(oldVChild, newVChild, parentDom, nodeDepth + 1, isSvg);
  }

  /** This will only be executed if newVChildren is longer than oldVChildren */
  for (; i < newLen; i++) {
    newVChild = newVChildren[i];
    parentDom.appendChild(renderDOM(newVChild, nodeDepth + 1, isSvg));
  }
}
