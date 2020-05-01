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
  if (!oldProps && !newProps) return void 0;

  // DIFFING ATTRS

  // setting new attrs
  if (newProps) {
    for (const [k, v] of newProps) {
      if (k[0] === 'o' && k[1] === 'n') {
        // event handlers
        const eventType = k.slice(2);
        // just add the event if there aren't old props, or if old props doesn't have the event
        if (!oldProps || !oldProps.has(k)) {
          $el.addEventListener(eventType, v);
        } else {
          /** if both old and new vnode have a listener for the same event,
           * check to see if they are the same fn. if they are, do nothing. */
          const oldHandler = oldProps.get(k);
          const newHandler = newProps.get(k);

          if (oldHandler !== newHandler) {
            $el.removeEventListener(eventType, oldHandler);
            $el.addEventListener(eventType, newHandler);
          }
        }
      } else {
        if (k !== 'key' && k !== 'ref') {
          // only patch if new attr didn't exist or not equal to old attr
          if (v !== oldProps?.get(k)) {
            if (k === 'checked' || k === 'disabled' || k === 'value') {
              // for inputs/buttons
              $el[k] = v;
            } else {
              $el.removeAttribute(k);
              $el.setAttribute(k, v);
            }
          }
        } else {
          if (k === 'ref' && typeof v === 'function') {
            // ref should be a function

            v($el);
          }
        }
      }
    }
  }

  // removing attrs
  if (oldProps) {
    for (const [k, v] of oldProps) {
      // remove prop if there are no new props, or if prop isn't in new props
      if (!newProps || !newProps.has(k)) {
        if (k[0] === 'o' && k[1] === 'n') {
          // event handlers

          $el.removeEventListener(k.slice(2), v);
        } else {
          $el.removeAttribute(k);
        }
      }
    }
  }

  return void 0;
}
