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

      node.dom = $el;

      return $el;

    case VNodeKind.T:
      node.dom = document.createTextNode(node.props.nodeValue);
      return node.dom;

    case VNodeKind.M:
      return renderDOM(node.children);
  }
}
