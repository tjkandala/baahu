import { VNode, VNodeKind } from '../createElement';
import { renderDOM } from '../renderDOM';
import { diffProps } from './props';
import { diffChildren, keyedDiffChildren } from './children';

export type PatchFunction = (
  element: HTMLElement | Text
) => HTMLElement | Text | undefined;

/**
 * this function returns a patch function for a $dom node represented
 * by oldVNode to make it look like newVNode.
 *
 * in baahu, we call diff with the previous root VNode, then call the patch
 * with the root $dom node.
 * */
export function diff(
  oldVNode: VNode,
  newVNode: VNode | undefined
): PatchFunction {
  /** there is no node in the new tree corresponding
   * to the old tree, so remove node */
  if (!newVNode)
    return ($element: HTMLElement | Text): undefined => {
      $element.remove();
      return void 0;
    };

  /** will optimize static elements! */
  if (oldVNode === newVNode) return $element => $element;

  switch (oldVNode.kind) {
    case VNodeKind.F:
      switch (newVNode.kind) {
        case VNodeKind.F:
          const patchChild = diff(oldVNode.child, newVNode.child);

          return ($element: HTMLElement | Text): HTMLElement => {
            patchChild($element);
            return $element as HTMLElement;
          };

        default:
          return ($element: HTMLElement | Text): HTMLElement => {
            const $newElement = renderDOM(newVNode);
            $element.replaceWith($newElement);
            return $element as HTMLElement;
          };
      }

    case VNodeKind.M:
      switch (newVNode.kind) {
        case VNodeKind.M:
          /** machines do not have their own DOM representation,
           * so just diff and patch their sole child */
          const patchChild = diff(oldVNode.child, newVNode.child);

          return ($element: HTMLElement | Text): HTMLElement => {
            patchChild($element);
            return $element as HTMLElement;
          };

        /** The logic is the same whether a machine node
         * is replaced with text or element node */
        default:
          /** Even though this operation represents the removal of a machine
           * node, we are unmounting machines here because that would break
           * the unkeyed diffChildren algorithm. If a machine node has
           * moved positions, unmounting machines here would incorrectly unmount
           * that machine instance even tho it still exists among its siblings
           *
           * TD;LR: Just because we are swapping out a machine node here
           * doesn't mean the instance can't exist in its siblings  */

          /**
           *  NEW INFO: all machine mounting is done in 'createElement'/'b',
           * all machine unmounting is done in 'diffMachines.' simpler than the
           * old approach and keeps the hot path clean
           */

          return ($element: HTMLElement | Text): HTMLElement => {
            const $newElement = renderDOM(newVNode);
            $element.replaceWith($newElement);
            return $element as HTMLElement;
          };
      }

    case VNodeKind.T:
      switch (newVNode.kind) {
        case VNodeKind.M:
          return ($element: HTMLElement | Text): HTMLElement => {
            const $newElement = renderDOM(newVNode.child);
            $element.replaceWith($newElement);
            return $element as HTMLElement;
          };

        case VNodeKind.F:
          return ($element: HTMLElement | Text): HTMLElement => {
            const $newElement = renderDOM(newVNode.child);
            $element.replaceWith($newElement);
            return $element as HTMLElement;
          };

        case VNodeKind.T:
          if (oldVNode.props.nodeValue === newVNode.props.nodeValue) {
            // do nothing, the text value is the same
            return $text => $text;
          } else {
            // the text value has changed, update text value
            return ($text: HTMLElement | Text): Text => {
              $text.nodeValue = newVNode.props.nodeValue;
              return $text as Text;
            };
          }

        case VNodeKind.E:
          // text node !== element node, so rerenderDOM
          return ($element: HTMLElement | Text): HTMLElement => {
            const $newElement = renderDOM(newVNode);
            $element.replaceWith($newElement);
            return $element as HTMLElement;
          };
      }

    case VNodeKind.E:
      switch (newVNode.kind) {
        case VNodeKind.M:
          return ($element: HTMLElement | Text): HTMLElement => {
            const $newElement = renderDOM(newVNode.child);
            $element.replaceWith($newElement);
            return $element as HTMLElement;
          };

        case VNodeKind.F:
          return ($element: HTMLElement | Text): HTMLElement => {
            const $newElement = renderDOM(newVNode.child);
            $element.replaceWith($newElement);
            return $element as HTMLElement;
          };

        case VNodeKind.E:
          if (oldVNode.tag !== newVNode.tag) {
            /** since the tags are different, assume the tree is
             * completely different (heuristic used in React): rerenderDOM */

            return ($element: HTMLElement | Text): HTMLElement => {
              const $newElement = renderDOM(newVNode);
              $element.replaceWith($newElement);
              return $newElement as HTMLElement;
            };
          } else {
            /**
             * most computation is done here. Both VNodes are ELEMENT_NODES and
             * have the same tag,  so we must diff props (attributes) and children
             */

            const patchProps = diffProps(oldVNode.props, newVNode.props);

            let patchChildren: PatchFunction;

            /**
             * only call diffKeyedChildren if the first nodes of both lists are keyed.
             * users should be aware of this behavior, and be sure to either key all
             * children or no children. this shortcut saves many iterations over children lists.
             *
             * most of the time, call diffChildren
             */

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

        case VNodeKind.T:
          /** text node !== element node, so rerenderDOM
           * a text node is necessarily a leaf, so no children */
          return ($element: HTMLElement | Text): Text => {
            $element.replaceWith(renderDOM(newVNode));
            return $element as Text;
          };
      }
  }
}
