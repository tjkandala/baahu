import { VNode, VNodeKind, b } from './createElement';
import { renderType } from './machineRegistry';

/** call this function with a VNode. it will recursively append DOM children until it reaches leaves */
export function renderDOM(
  node: VNode,
  nodeDepth: number,
  isSvg: boolean = false
): HTMLElement | Text {
  node.h = nodeDepth;

  let doc = document; // helps w/ minification

  switch (node.x) {
    case VNodeKind.E:
      isSvg = node.t === 'svg' || isSvg;

      // any saves bytes (useless checking of 'disabled in el')
      const $el: any = isSvg
        ? doc.createElementNS('http://www.w3.org/2000/svg', node.t)
        : doc.createElement(node.t);

      const attrs = node.a;

      if (attrs) {
        for (const k in node.a) {
          if (k[0] === 'o' && k[1] === 'n') {
            $el.addEventListener(k.substring(2).toLowerCase(), attrs[k]);
          } else {
            if (k === 'disabled') {
              $el[k] = attrs[k];
            } else if (k === 'ref') {
              /** istanbul ignore next */
              if (process.env.NODE_ENV !== 'production') {
                if (typeof attrs[k] !== 'function') {
                  throw new TypeError('ref must be a function');
                }
              }

              attrs[k]($el);
            } else if (k !== 'key') {
              $el.setAttribute(k, attrs[k]);
            }
          }
        }
      }

      let kids = node.c;
      // let child: HTMLElement | Text;
      for (let i = 0, len = kids.length; i < len; i++) {
        // child = renderDOM(kids[i]);
        $el.appendChild(renderDOM(kids[i], nodeDepth + 1, isSvg));
      }

      node.d = $el;

      return $el;

    case VNodeKind.T:
      node.d = doc.createTextNode(node.a.n);

      return node.d;

    case VNodeKind.M:
      node.d = renderDOM(node.c, nodeDepth + 1, isSvg) as HTMLElement;
      return node.d;

    case VNodeKind.O:
      /**
       * the following code should be run from diffChildren (keyed or unkeyed)
       * (when a new node is created at this position), or replace() from diff()
       *
       * check for render type to make sure this isn't doing redundant work for first mount!
       *
       * have to render the vnode first, then replace the placeholder child with it.
       * call renderDOM as usual. set node.d to the return value, then return node.d
       */
      if (renderType.t !== 'r') {
        // memo ignores children. it wouldn't work with children anyways
        node.c = b(node.t, node.a);
      }
      // if renderType was r, the vnode was already created in b()
      node.d = renderDOM(node.c, nodeDepth + 1, isSvg) as HTMLElement;

      return node.d;
  }
}
