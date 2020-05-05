/* eslint-disable @typescript-eslint/no-explicit-any */
import { Props } from '../createElement';

// this is actually attrs.... rename! change to in-place diff
export function diffProps(
  oldProps: Props | null | undefined,
  newProps: Props | null | undefined,
  // $el: HTMLElement | HTMLInputElement,
  // originally wrote the code with the proper types,
  // but any saves bytes (useless checking of 'disabled in el')
  $el: any
): void {
  // don't waste time creating and executing a function if neither vnodes have attrs
  if (!oldProps && !newProps) return;

  // DIFFING ATTRS

  // setting new attrs
  if (newProps) {
    for (const k in newProps) {
      if (k[0] === 'o' && k[1] === 'n') {
        // event handlers
        const eventType = k.slice(2).toLowerCase();
        // just add the event if there aren't old props, or if old props doesn't have the event
        if (!oldProps || !oldProps[k]) {
          $el.addEventListener(eventType, newProps[k]);
        } else {
          /** if both old and new vnode have a listener for the same event,
           * check to see if they are the same fn. if they are, do nothing. */
          const oldHandler = oldProps[k];
          const newHandler = newProps[k];

          if (oldHandler !== newHandler) {
            $el.removeEventListener(eventType, oldHandler);
            $el.addEventListener(eventType, newHandler);
          }
        }
      } else if (k !== 'key') {
        // only patch if new attr didn't exist in old, or not equal to old attr
        if (!oldProps || newProps[k] !== oldProps[k]) {
          if (k === 'checked' || k === 'disabled' || k === 'value') {
            // for inputs/buttons
            $el[k] = newProps[k];
          } else if (k === 'ref') {
            // ref should be a function
            if (process.env.NODE_ENV !== 'production') {
              if (typeof newProps[k] !== 'function') {
                throw new TypeError('ref must be a function');
              }
            }

            newProps[k]($el);
          } else {
            $el.removeAttribute(k);
            $el.setAttribute(k, newProps[k]);
          }
        }
      }
    }
  }

  // removing attrs
  if (oldProps) {
    for (const k in oldProps) {
      // remove prop if there are no new props, or if prop isn't in new props
      if (!newProps || !newProps[k]) {
        if (k[0] === 'o' && k[1] === 'n') {
          // event handlers

          $el.removeEventListener(k.slice(2), oldProps[k]);
        } else {
          $el.removeAttribute(k);
        }
      }
    }
  }

  return;
}
