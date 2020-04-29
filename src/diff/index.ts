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
    if (oldVNode.kind === VNodeKind.M) {
      oldVNode.children.dom && oldVNode.children.dom.remove();
    } else {
      oldVNode.dom && oldVNode.dom.remove();
    }
    return;
  }

  switch (oldVNode.kind) {
    case VNodeKind.E:
      switch (newVNode.kind) {
        case VNodeKind.E:
          if (oldVNode.tag !== newVNode.tag) {
            /** different tags can't represent the same node */
            return replace(oldVNode, newVNode, parentDom);
          } else {
            /** most computation is done here. Both VNodes are ELEMENT_NODES and
             * have the same tag,  so we must diff props (attributes) and children */

            diffProps(
              oldVNode.props,
              newVNode.props,
              oldVNode.dom as HTMLElement
            );

            /** only call diffKeyedChildren if the first nodes of both lists are keyed.
             * users should be aware of this behavior, and be sure to either key all
             * children or no children. this shortcut saves many iterations over children lists.
             *
             * most of the time, call diffChildren */

            const firstOldChild = oldVNode.children[0];
            const firstNewChild = newVNode.children[0];

            if (
              firstOldChild &&
              firstOldChild.key &&
              firstNewChild &&
              firstNewChild.key
            ) {
              keyedDiffChildren(
                oldVNode.children,
                newVNode.children,
                // asserting the type bc it'll only be null after createElement and before renderDOM
                oldVNode.dom as HTMLElement
              );
            } else {
              diffChildren(
                oldVNode.children,
                newVNode.children,
                oldVNode.dom as HTMLElement
              );
            }

            // pass on the dom node since they are the same element
            newVNode.dom = oldVNode.dom;

            return;
          }

        default:
          return replace(oldVNode, newVNode, parentDom);
      }

    case VNodeKind.T:
      switch (newVNode.kind) {
        case VNodeKind.T:
          if (oldVNode.props.nodeValue === newVNode.props.nodeValue) {
            newVNode.dom = oldVNode.dom;
            return;
          } else {
            oldVNode.dom && (oldVNode.dom.nodeValue = newVNode.props.nodeValue);
            newVNode.dom = oldVNode.dom;
            return;
          }

        default:
          return replace(oldVNode, newVNode, parentDom);
      }

    case VNodeKind.M:
      switch (newVNode.kind) {
        case VNodeKind.M:
          // "children" of a machineVNode is one child
          diff(oldVNode.children, newVNode.children, parentDom);
          return;

        default:
          return replace(oldVNode.children, newVNode, parentDom);
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
    parentDom.replaceChild($new, oldVNode.dom as HTMLElement);
  } else {
    oldVNode.dom && oldVNode.dom.replaceWith($new);
  }
}
