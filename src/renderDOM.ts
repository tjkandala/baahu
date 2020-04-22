import { VNode, VNodeKind } from './createElement';

/** call this function with a VNode. it will recursively append DOM children until it reaches leaves */
export function renderDOM(node: VNode): HTMLElement | Text {
  switch (node.kind) {
    case VNodeKind.E:
      const $el = document.createElement(node.tag);

      if (node.props) {
        for (const [prop, value] of node.props) {
          if (prop.startsWith('on')) {
            $el.addEventListener(prop.substring(2).toLowerCase(), value);
          } else {
            if (prop !== 'key' && prop !== 'ref') {
              $el.setAttribute(prop, value);
            } else if (prop === 'ref') {
              if (process.env.NODE_ENV !== 'production') {
                if (typeof value !== 'function') {
                  throw new TypeError('ref must be a function');
                }
              }

              value($el);
            }
          }
        }
      }

      let child: HTMLElement | Text;
      for (let i = 0, len = node.children.length; i < len; i++) {
        child = renderDOM(node.children[i]);
        $el.appendChild(child);
      }

      return $el;

    case VNodeKind.T:
      return document.createTextNode(node.props.nodeValue);

    case VNodeKind.M:
      /** machine nodes are represented in the dom by their child, so call
       * render with child during diff to avoid this almost meaningless case */
      return renderDOM(node.child);
  }
}
