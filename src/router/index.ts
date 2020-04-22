/* eslint-disable @typescript-eslint/explicit-function-return-type */
class RTNode<T> {
  handler?: T;
  /** map of general named routes that are children of this node */
  children: Map<string, RTNode<T>>;
  /** named route tuple. first index represents the name of the edge,
   * second index points to the node. this is semantically different
   * from normal children bc we want to read the string, not match it
   * (we check for named param if route doesn't exist in children) */
  param?: [string, RTNode<T>];
  /** if a route doesn't exist in children, and a node doesn't have
   * a named param, go to wildcard */
  wildcard?: RTNode<T>;

  constructor() {
    this.children = new Map();
  }
}

export type Params = {
  [name: string]: string;
};

export class RouTrie<T = () => unknown> {
  root: RTNode<T>;
  cache: Map<string, { handler: T; params: Params }>;

  constructor() {
    this.root = new RTNode();
    this.cache = new Map();
  }

  insert(path: string, handler: T): void {
    let node = this.root;
    const routes = path[0] === '/' ? path.slice(1).split('/') : path.split('/');
    /** have to use this placeholder node bc typescript
     * can't ensure that a node exists in children even
     * after checking node.children.has(key)! */
    let nextNode: RTNode<T> | undefined;
    /** variable to hold first char to check is route is named/a wildcard */
    let prefix: string;
    /** holds each "subroute"; each element of the resulting routes array */
    let route: string;
    let i: number;
    let paramName: string;

    // default route logic: root handler. don't need to
    // check for length; * has to be wildcard
    if (routes[0] === '*') {
      this.root.handler = handler;
      return;
    }

    for (i = 0; i < routes.length; i++) {
      route = routes[i];
      prefix = route[0];

      switch (prefix) {
        case ':':
          /** name of the param */
          paramName = route.slice(1);

          if (node.param) {
            /** this will rename the param name if it has changed...
             * a rational user wouldn't overload a named param though */
            node.param[0] = paramName;
            node = node.param[1];
          } else {
            nextNode = new RTNode();
            node.param = [paramName, nextNode];
            node = nextNode;
          }
          break;
        case '*':
          /** this means prefix is * -> wildcard. this SHOULD be the
           * last route of routes... a rational user wouldn't append
           * more route nodes to a catch-all */
          if (node.wildcard) node = node.wildcard;
          else {
            nextNode = new RTNode();
            node.wildcard = nextNode;
            node = nextNode;
          }
          break;
        default:
          // logic for normal routes (fixed strings)
          nextNode = node.children.get(route);
          if (nextNode !== void 0) node = nextNode;
          else {
            nextNode = new RTNode();
            node.children.set(route, nextNode);
            node = nextNode;
          }
          break;
      }
    }
    node.handler = handler;
  }

  find(path: string): { handler: T; params: Params } | undefined {
    const cached = this.cache.get(path);
    if (cached) return cached;

    let node = this.root;
    const routes = path[0] === '/' ? path.slice(1).split('/') : path.split('/');
    /** have to use this placeholder node bc typescript
     * can't ensure that a node exists in children even
     * after checking node.children.has(key)! */
    let nextNode: RTNode<T> | undefined;
    /** holds each "subroot", each element of the resulting routes array */
    let route: string;
    let i: number;
    const params: Params = {};
    let result: { handler: T; params: Params };

    // TODO: try/catch for decodeURIComponent (for malformed uris, w/ % not followed by 2 digits)
    // ...might not be important tho? that's not an encoded route!
    for (i = 0; i < routes.length; i++) {
      route = routes[i];

      nextNode = node.children.get(route);
      if (nextNode !== void 0) node = nextNode;
      // reassign node, keep going.
      else {
        // Do named param/wildcard checks here!
        if (node.param) {
          params[node.param[0]] = decodeURIComponent(route);
          node = node.param[1];
          // reassign node, keep going.
        } else if (node.wildcard) {
          // this might have a wildcard/catch-all
          node = node.wildcard;
          params['wildcard'] = decodeURIComponent(routes.slice(i).join('/'));
          // stop iteration here, you wouldn't want to match a route after a wildcard
          // if there's no route handler, return undefined
          return node.handler
            ? { handler: node.handler, params: params }
            : void 0;
        } else {
          // if there isn't a nested wildcard, check if there is a default wildcard
          return this.root.handler
            ? {
                handler: this.root.handler,
                params: {
                  wildcard: decodeURIComponent(
                    path[0] === '/' ? path.slice(1) : path
                  ),
                },
              }
            : void 0;
        }
      }
    }
    /** end of iteration; all routes have been handled,
     * and node now points to where we need to be. cache :) */

    if (node.handler) {
      result = { handler: node.handler, params: params };
      this.cache.size < 10000 && this.cache.set(path, result);
      return result;
    } else return void 0;
  }
}
