import { VNode, VNodeKind } from './createElement';

/** call this function with a VNode. it will recursively append DOM children until it reaches leaves */
export function render(node: VNode): HTMLElement | Text {
  switch (node.kind) {
    case VNodeKind.M:
      /** machine nodes are represented in the dom by their child, so call
       * render with child during diff to avoid this almost meaningless case */
      return render(node.child);

    case VNodeKind.E:
      const $el = document.createElement(node.tag);

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

      // if (node.children) {
      //   for (let i = 0; i < node.children.length; i++) {
      //     $el.appendChild(render(node.children[i]));
      //   }
      // }

      let child: HTMLElement | Text;
      for (let i = 0, len = node.children.length; i < len; i++) {
        child = render(node.children[i]);
        $el.appendChild(child);
      }

      return $el;

    case VNodeKind.T:
      const $text = document.createTextNode(node.props.nodeValue);

      return $text;
  }
}
