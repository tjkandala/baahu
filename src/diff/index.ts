import { VNode, VNodeKind } from '../createElement';
import { renderDOM } from '../renderDOM';
import { diffProps } from './props';
import {
  diffChildren,
  keyedDiffChildren,
  safelyRemoveVNode,
  unmountMachine,
} from './children';

export function diff(
  oldVNode: VNode,
  newVNode: VNode | undefined | null,
  parentDom: HTMLElement | null,
  nodeDepth: number
): void {
  // if (nodeDepth == null) {
  //   console.log('no node depth');
  //   console.log(oldVNode);
  // }
  // if (oldVNode.h == null) {
  //   console.log('old v node dont got it');
  // }

  // if (nodeDepth === 0) {
  //   console.log(oldVNode);
  // }

  // if (nodeDepth !== oldVNode.h) {
  //   console.log('inequality!!');
  //   console.log(nodeDepth);
  //   console.log(oldVNode);
  // }

  /**
   * temporary 'tests' while adding node depth!
   */

  /** for machines not targeted, isLeaf, memo, static elements!
   * don't need to pass on dom (test it), same vnode
   */
  if (oldVNode === newVNode) return;

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

  newVNode.h = nodeDepth;

  switch (oldVNode.x) {
    case VNodeKind.Element:
      switch (newVNode.x) {
        case VNodeKind.Element:
          if (oldVNode.t !== newVNode.t) {
            /** different tags can't represent the same node */
            return replace(oldVNode, newVNode, parentDom, nodeDepth);
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
                nodeDepth
              );
            } else {
              diffChildren(
                oldVNode.c,
                newVNode.c,
                oldVNode.d as HTMLElement,
                nodeDepth
              );
            }

            // pass on the dom node since they are the same element
            newVNode.d = oldVNode.d;

            return;
          }

        default:
          return replace(oldVNode, newVNode, parentDom, nodeDepth);
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
          return replace(oldVNode, newVNode, parentDom, nodeDepth);
      }

    case VNodeKind.Machine:
      switch (newVNode.x) {
        case VNodeKind.Machine:
          oldVNode.i !== newVNode.i && unmountMachine(oldVNode.i);

          // "children" of a machineVNode is one child
          diff(oldVNode.c, newVNode.c, parentDom, nodeDepth + 1);
          return;

        default:
          return replace(oldVNode.c, newVNode, parentDom, nodeDepth);
      }

    /** can't do memo without node depth-based global event opts anyways.. so finish
     * those first!
     */

    case VNodeKind.Memo:
      switch (newVNode.x) {
        case VNodeKind.Memo:
          if (oldVNode.a === newVNode.a) {
            newVNode.c = oldVNode.c;
          } else {
            // render, diff, assign newVNode.d and newVNode.c
          }

          return;

        default:
          /** it WILL have a child (empty text node at minimum... what if its child is a lazy too?)
           * NVM, same as with machines! make sure the .d property represents the closest child with a dom representation!
           * at worst, it will be an empty text node
           */
          return replace(oldVNode.c!, newVNode, parentDom, nodeDepth);
      }
  }
}

function replace(
  oldVNode: VNode,
  newVNode: VNode,
  parentDom: HTMLElement | null,
  nodeDepth: number
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

  const $new = renderDOM(newVNode, nodeDepth);
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
