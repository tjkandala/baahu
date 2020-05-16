/* eslint-disable @typescript-eslint/explicit-function-return-type */
class RTNode<T> {
  /**
   * handler
   */
  h?: T;
  /**
   * children:
   *  map of general named routes that are children of this node */
  c: Map<string, RTNode<T>>;
  /**
   * param:
   *  named route tuple. first index represents the name of the edge,
   * second index points to the node. this is semantically different
   * from normal children bc we want to read the string, not match it
   * (we check for named param if route doesn't exist in children) */
  p?: [string, RTNode<T>];
  /**
   * wildcard:
   * if a route doesn't exist in children, and a node doesn't have
   * a named param, go to wildcard */
  wc?: RTNode<T>;

  constructor() {
    this.c = new Map();
  }
}

export type Params = {
  [name: string]: string;
};

export class RouTrie<T = () => unknown> {
  /** root */
  r: RTNode<T>;
  /** cache */
  c: Map<string, { h: T; p: Params }>;

  constructor() {
    this.r = new RTNode();
    this.c = new Map();
  }

  /** insert */
  i(path: string, handler: T): void {
    let node = this.r,
      routes = path[0] === '/' ? path.slice(1).split('/') : path.split('/'),
      /** have to use this placeholder node bc typescript
       * can't ensure that a node exists in children even
       * after checking node.children.has(key)! */
      nextNode: RTNode<T> | undefined,
      /** variable to hold first char to check is route is named/a wildcard */
      prefix: string,
      /** holds each "subroute"; each element of the resulting routes array */
      route: string,
      i: number,
      paramName: string;

    // default route logic: root handler. don't need to
    // check for length; * has to be wildcard
    if (routes[0] === '*') {
      this.r.h = handler;
      return;
    }

    for (i = 0; i < routes.length; i++) {
      route = routes[i];
      prefix = route[0];

      switch (prefix) {
        case ':':
          /** name of the param */
          paramName = route.slice(1);

          if (node.p) {
            /** this will rename the param name if it has changed...
             * a rational user wouldn't overload a named param though */
            node.p[0] = paramName;
            node = node.p[1];
          } else {
            nextNode = new RTNode();
            node.p = [paramName, nextNode];
            node = nextNode;
          }
          break;
        case '*':
          /** this means prefix is * -> wildcard. this SHOULD be the
           * last route of routes... a rational user wouldn't append
           * more route nodes to a catch-all */
          if (node.wc) node = node.wc;
          else {
            nextNode = new RTNode();
            node.wc = nextNode;
            node = nextNode;
          }
          break;
        default:
          // logic for normal routes (fixed strings)
          nextNode = node.c.get(route);
          if (nextNode !== void 0) node = nextNode;
          else {
            nextNode = new RTNode();
            node.c.set(route, nextNode);
            node = nextNode;
          }
          break;
      }
    }
    node.h = handler;
  }

  /** find */
  f(path: string): { h: T; p: Params } | undefined {
    const cached = this.c.get(path);
    if (cached) return cached;

    let node = this.r,
      routes = path[0] === '/' ? path.slice(1).split('/') : path.split('/'),
      /** have to use this placeholder node bc typescript
       * can't ensure that a node exists in children even
       * after checking node.children.has(key)! */
      nextNode: RTNode<T> | undefined,
      /** holds each "subroot", each element of the resulting routes array */
      route: string,
      i: number,
      params: Params = {},
      result: { h: T; p: Params };

    // TODO: try/catch for decodeURIComponent (for malformed uris, w/ % not followed by 2 digits)
    // ...might not be important tho? that's not an encoded route!
    for (i = 0; i < routes.length; i++) {
      route = routes[i];

      nextNode = node.c.get(route);
      if (nextNode !== void 0) node = nextNode;
      // reassign node, keep going.
      else {
        // Do named param/wildcard checks here!
        if (node.p) {
          params[node.p[0]] = decodeURIComponent(route);
          node = node.p[1];
          // reassign node, keep going.
        } else if (node.wc) {
          // this might have a wildcard/catch-all
          node = node.wc;
          params['wildcard'] = decodeURIComponent(routes.slice(i).join('/'));
          // stop iteration here, you wouldn't want to match a route after a wildcard
          // if there's no route handler, return undefined
          return node.h ? { h: node.h, p: params } : void 0;
        } else {
          // if there isn't a nested wildcard, check if there is a default wildcard
          return this.r.h
            ? {
                h: this.r.h,
                p: {
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

    if (node.h) {
      result = { h: node.h, p: params };
      this.c.size < 10000 && this.c.set(path, result);
      return result;
    } else return void 0;
  }
}
