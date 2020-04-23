import { VNode, VNodeKind } from '../createElement';
import { renderDOM } from '../renderDOM';
import { diffProps } from './props';
import { diffChildren, keyedDiffChildren } from './children';

export type PatchFunction = (
  element: HTMLElement | Text
) => HTMLElement | Text | undefined;

/**
 * ELI5: this function returns a patch function for a $dom node represented
 * by oldVNode to make it look like newVNode.
 * */
export function diff(
  oldVNode: VNode,
  newVNode: VNode | undefined
): PatchFunction {
  /** for isLeaf, memo, or static elements! */
  if (oldVNode === newVNode) return $element => $element;

  /** there is no node in the new tree corresponding
   * to the old tree, so remove node */
  if (!newVNode)
    return $element => {
      $element.remove();
      return void 0;
    };

  switch (oldVNode.kind) {
    case VNodeKind.E:
      switch (newVNode.kind) {
        case VNodeKind.E:
          if (oldVNode.tag !== newVNode.tag) {
            /** different tags can't represent the same node */
            return createReplacePatch(newVNode);
          } else {
            /** most computation is done here. Both VNodes are ELEMENT_NODES and
             * have the same tag,  so we must diff props (attributes) and children */

            const patchProps = diffProps(oldVNode.props, newVNode.props);

            let patchChildren: PatchFunction;

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
              patchChildren = keyedDiffChildren(
                oldVNode.children,
                newVNode.children
              );
            } else {
              patchChildren = diffChildren(
                oldVNode.children,
                newVNode.children
              );
            }

            return ($element: HTMLElement | Text): HTMLElement => {
              patchProps && patchProps($element as HTMLElement);
              patchChildren($element);
              return $element as HTMLElement;
            };
          }

        default:
          return createReplacePatch(newVNode);
      }

    case VNodeKind.T:
      switch (newVNode.kind) {
        case VNodeKind.T:
          if (oldVNode.props.nodeValue === newVNode.props.nodeValue) {
            return $text => $text;
          } else {
            return $text => {
              $text.nodeValue = newVNode.props.nodeValue;
              return $text as Text;
            };
          }

        default:
          return createReplacePatch(newVNode);
      }
  }
}

function createReplacePatch(newVNode: VNode) {
  return ($element: HTMLElement | Text): HTMLElement => {
    const $newElement = renderDOM(newVNode);
    $element.replaceWith($newElement);
    return $element as HTMLElement;
  };
}
