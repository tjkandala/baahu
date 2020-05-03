import { VNode, VNodeKind } from '../createElement';
import { renderDOM } from '../renderDOM';
import { diffProps } from './props';
import { diffChildren, keyedDiffChildren } from './children';

export function diff(
  oldVNode: VNode,
  newVNode: VNode | undefined | null,
  parentDom: HTMLElement | null
): void {
  /** for isLeaf, memo, or static elements!
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
    return;
  }

  switch (oldVNode.x) {
    case VNodeKind.Element:
      switch (newVNode.x) {
        case VNodeKind.Element:
          if (oldVNode.t !== newVNode.t) {
            /** different tags can't represent the same node */
            return replace(oldVNode, newVNode, parentDom);
          } else {
            /** most computation is done here. Both VNodes are ELEMENT_NODES and
             * have the same tag,  so we must diff props (attributes) and children */

            diffProps(oldVNode.a, newVNode.a, oldVNode.d as HTMLElement);

            /** only call diffKeyedChildren if the first nodes of both lists are keyed.
             * users should be aware of this behavior, and be sure to either key all
             * children or no children. this shortcut saves many iterations over children lists.
             *
             * most of the time, call diffChildren */

            const firstOldChild = oldVNode.c[0];
            const firstNewChild = newVNode.c[0];

            if (
              firstOldChild &&
              firstOldChild.k &&
              firstNewChild &&
              firstNewChild.k
            ) {
              keyedDiffChildren(
                oldVNode.c,
                newVNode.c,
                // asserting the type bc it'll only be null after createElement and before renderDOM. can't be null at diff
                oldVNode.d as HTMLElement
              );
            } else {
              diffChildren(oldVNode.c, newVNode.c, oldVNode.d as HTMLElement);
            }

            // pass on the dom node since they are the same element
            newVNode.d = oldVNode.d;

            return;
          }

        default:
          return replace(oldVNode, newVNode, parentDom);
      }

    case VNodeKind.Text:
      switch (newVNode.x) {
        case VNodeKind.Text:
          if (oldVNode.a.n === newVNode.a.n) {
            newVNode.d = oldVNode.d;
            return;
          } else {
            oldVNode.d && (oldVNode.d.nodeValue = newVNode.a.n);
            newVNode.d = oldVNode.d;
            return;
          }

        default:
          return replace(oldVNode, newVNode, parentDom);
      }

    case VNodeKind.Machine:
      switch (newVNode.x) {
        case VNodeKind.Machine:
          // "children" of a machineVNode is one child
          diff(oldVNode.c, newVNode.c, parentDom);
          return;

        default:
          return replace(oldVNode.c, newVNode, parentDom);
      }
  }
}

function replace(
  oldVNode: VNode,
  newVNode: VNode,
  parentDom: HTMLElement | null
): void {
  // replaceWith isn't supported on old browsers
  const $new = renderDOM(newVNode);
  if (parentDom) {
    parentDom.replaceChild($new, oldVNode.d as HTMLElement);
  } else {
    // this is convoluted try to golf it
    const $d = oldVNode.d;
    if ($d) {
      const $parent = $d.parentElement;
      $parent && $parent.replaceChild($new, $d);
    }
  }
}
