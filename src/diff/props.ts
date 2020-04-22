/* eslint-disable @typescript-eslint/no-explicit-any */
import { Props } from '../createElement';

export type PropPatchFunction = (
  element: HTMLElement | HTMLInputElement
) => HTMLElement;

export function diffProps(oldProps: Props, newProps: Props): PropPatchFunction {
  const patches: Array<PropPatchFunction> = [];

  // setting new attrs
  for (const [k, v] of newProps) {
    if (k.slice(0, 2) === 'on') {
      // event handlers
      const eventType = k.slice(2);

      if (!oldProps.has(k)) {
        patches.push($el => {
          $el.addEventListener(eventType, v);
          return $el;
        });
      } else {
        /** if both old and new vnode have a listener for the same event,
         * check to see if they are the same fn. if they are, do nothing. */
        const oldHandler = oldProps.get(k);
        const newHandler = newProps.get(k);

        if (oldHandler !== newHandler) {
          patches.push($el => {
            $el.removeEventListener(eventType, oldHandler);
            $el.addEventListener(eventType, newHandler);
            return $el;
          });
        }
      }
    } else {
      // don't need to check if attr is already there, unlike events, bc they're unique
      if (k !== 'key' && k !== 'ref') {
        patches.push($el => {
          if (k === 'value' && 'value' in $el) {
            // for inputs
            $el.value = v;
          }
          $el.setAttribute(k, v);
          return $el;
        });
      } else {
        if (k === 'ref' && typeof v === 'function') {
          // ref should be a function
          patches.push($el => {
            v($el);
            return $el;
          });
        }
      }
    }
  }

  // removing attrs
  for (const [k, v] of oldProps) {
    if (!newProps.has(k)) {
      if (k.slice(0, 2) === 'on') {
        // event handlers
        patches.push($el => {
          $el.removeEventListener(k.slice(2), v);
          return $el;
        });
      } else {
        patches.push($el => {
          $el.removeAttribute(k);
          return $el;
        });
      }
    }
  }

  return ($el): HTMLElement => {
    let i = patches.length;
    while (i--) patches[i]($el);

    return $el;
  };
}
