import { VNode, VNodeKind } from './createElement';

/** call this function with a VNode. it will recursively append DOM children until it reaches leaves */
export function renderDOM(node: VNode): HTMLElement | Text {
  switch (node.x) {
    case VNodeKind.Element:
      // any saves bytes (useless checking of 'disabled in el')
      const $el: any = document.createElement(node.t);

      if (node.a) {
        for (const [prop, value] of node.a) {
          if (prop[0] === 'o' && prop[1] === 'n') {
            $el.addEventListener(prop.substring(2).toLowerCase(), value);
          } else {
            if (prop === 'disabled') {
              $el.disabled = value;
            } else if (prop === 'ref') {
              if (process.env.NODE_ENV !== 'production') {
                if (typeof value !== 'function') {
                  throw new TypeError('ref must be a function');
                }
              }

              value($el);
            } else if (prop !== 'key') {
              $el.setAttribute(prop, value);
            }
          }
        }
      }

      let child: HTMLElement | Text;
      for (let i = 0, len = node.c.length; i < len; i++) {
        child = renderDOM(node.c[i]);
        $el.appendChild(child);
      }

      node.d = $el;

      return $el;

    case VNodeKind.Text:
      node.d = document.createTextNode(node.a.n);
      return node.d;

    case VNodeKind.Machine:
      return renderDOM(node.c);
  }
}
