import { VNode, VNodeKind } from './createElement';

/** call this function with a VNode. it will recursively append DOM children until it reaches leaves */
export function renderDOM(node: VNode): HTMLElement | Text {
  switch (node.x) {
    case VNodeKind.Element:
      // any saves bytes (useless checking of 'disabled in el')
      const $el: any = document.createElement(node.t);

      const attrs = node.a;

      if (attrs) {
        for (const k in node.a) {
          if (k[0] === 'o' && k[1] === 'n') {
            $el.addEventListener(k.substring(2).toLowerCase(), attrs[k]);
          } else {
            if (k === 'disabled') {
              $el[k] = attrs[k];
            } else if (k === 'ref') {
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
        $el.appendChild(renderDOM(kids[i]));
      }

      node.d = $el;

      return $el;

    case VNodeKind.Text:
      node.d = document.createTextNode(node.a.n);

      return node.d;

    case VNodeKind.Machine:
      node.d = renderDOM(node.c) as HTMLElement;
      return node.d;
  }
}
