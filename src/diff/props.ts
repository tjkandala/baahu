/* eslint-disable @typescript-eslint/no-explicit-any */
import { Props } from '../createElement';
import { eType } from '../renderDOM';
import { addEvtLst, rmvEvtLst, rmvAttr, setAttr } from '../constants';

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
        const eventType = eType(k);
        // just add the event if there aren't old props, or if old props doesn't have the event
        if (!oldProps || !oldProps[k]) {
          $el[addEvtLst](eventType, newProps[k]);
        } else {
          /** if both old and new vnode have a listener for the same event,
           * check to see if they are the same fn. if they are, do nothing. */
          const oldHandler = oldProps[k];
          const newHandler = newProps[k];

          if (oldHandler !== newHandler) {
            $el[rmvEvtLst](eventType, oldHandler);
            $el[addEvtLst](eventType, newHandler);
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
            /* istanbul ignore next */
            if (process.env.NODE_ENV !== 'production') {
              if (typeof newProps[k] !== 'function') {
                throw new TypeError('ref must be a function');
              }
            }

            newProps[k]($el);
          } else {
            $el[rmvAttr](k);
            $el[setAttr](k, newProps[k]);
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
          $el[rmvEvtLst](eType(k), oldProps[k]);
        } else {
          $el[rmvAttr](k);
        }
      }
    }
  }

  return;
}
