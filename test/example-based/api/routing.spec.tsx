/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { RouTrie } from '../../../src/router';
import { SFC, createMachine } from '../../../src/component';
import { b, createRouter, linkTo, mount } from '../../../src/index';
import { machineRegistry } from '../../../src/machineRegistry';

describe('router', () => {
  let $root = document.body;
  test('machine unmount on route change', () => {
    const HomeMachine = createMachine({
      id: 'home',
      initialContext: () => ({}),
      initialState: 'here',
      states: {
        here: {},
      },
      render: () => <p>the home machine</p>,
    });

    const Home: SFC = () => (
      <div>
        <p>home page</p>
        <HomeMachine />
      </div>
    );

    const Room: SFC<{ roomid: string }> = ({ roomid }) => (
      <div>
        <p>{roomid}</p>
      </div>
    );

    const MyRouter = createRouter({
      '/': () => <Home />,
      '/room/:roomid': ({ roomid }) => <Room roomid={roomid} />,
    });

    const App: SFC = () => (
      <div>
        <MyRouter />
      </div>
    );

    $root = mount(App, $root) as HTMLElement;

    expect($root.firstChild?.firstChild?.nodeName).toBe('P');
    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe(
      'home page'
    );
    expect($root.firstChild?.childNodes[1]?.nodeName).toBe('P');
    expect($root.firstChild?.childNodes[1]?.firstChild?.nodeValue).toBe(
      'the home machine'
    );

    // home machine should be in the registry after mount
    expect([...machineRegistry.keys()]).toStrictEqual(['home']);

    // navigate away from home. home machine should be unmounted
    linkTo('/room/cool');

    expect([...machineRegistry.keys()]).toStrictEqual([]);

    expect($root.firstChild?.firstChild?.nodeName).toBe('P');
    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe('cool');

    // go back home. home machine should be mounted
    linkTo('/');

    expect([...machineRegistry.keys()]).toStrictEqual(['home']);

    expect($root.firstChild?.firstChild?.nodeName).toBe('P');
    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe(
      'home page'
    );
    expect($root.firstChild?.childNodes[1]?.nodeName).toBe('P');
    expect($root.firstChild?.childNodes[1]?.firstChild?.nodeValue).toBe(
      'the home machine'
    );

    // bad route returns undefined. should unmount home machine
    linkTo('/bad/route');

    expect([...machineRegistry.keys()]).toStrictEqual([]);

    expect($root.childNodes.length).toBe(0);

    // can recover from bad route
    linkTo('/room/bar');

    expect([...machineRegistry.keys()]).toStrictEqual([]);

    expect($root.firstChild?.firstChild?.nodeName).toBe('P');
    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe('bar');

    // go back home (test caching, machine mounting)
    linkTo('/');

    expect([...machineRegistry.keys()]).toStrictEqual(['home']);

    expect($root.firstChild?.firstChild?.nodeName).toBe('P');
    expect($root.firstChild?.firstChild?.firstChild?.nodeValue).toBe(
      'home page'
    );
    expect($root.firstChild?.childNodes[1]?.nodeName).toBe('P');
    expect($root.firstChild?.childNodes[1]?.firstChild?.nodeValue).toBe(
      'the home machine'
    );
  });

  // TODO: emitting route changes from machines event! not encouraged but see what happens. setting timeout, after all
  // this will have to be an async test

  test('nested routers', () => {
    expect(true).toBe(true);
  });

  test('trie', () => {
    const myTrie = new RouTrie();

    /**
     * These routes demonstrate that regular routes are found first,
     * then parameterized routes or wildcard routes
     */

    const homeHandler = () => 'the home page';
    const usersHandler = () => 'general users page';
    const topUsersHandler = () => 'top users leaderboard';
    const namedUserHandler = () => 'specific user page';
    const userLikesHandler = () => "that user's likes";
    const userFollowersHandler = () => "that user's followers";
    const gamesHandler = () => 'my game page';
    const sushigoHandler = () => 'play sushigo!';
    const gameWildcardHandler = () => "this game doesn't exist yet";
    const catchallHandler = () => '404 catchall';

    myTrie.insert('/', homeHandler);
    myTrie.insert('/users', usersHandler);
    myTrie.insert('/users/top', topUsersHandler);
    myTrie.insert('/users/:name', namedUserHandler);
    myTrie.insert('/users/:name/likes', userLikesHandler);
    myTrie.insert('/users/:name/followers', userFollowersHandler);
    myTrie.insert('/games', gamesHandler);
    myTrie.insert('/games/sushigo', sushigoHandler);
    myTrie.insert('/games/*', gameWildcardHandler);
    myTrie.insert('*', catchallHandler);

    expect(myTrie.find('/')).toStrictEqual({
      handler: homeHandler,
      params: {},
    });

    expect(myTrie.find('/users')).toStrictEqual({
      handler: usersHandler,
      params: {},
    });

    expect(myTrie.find('/users/top')).toStrictEqual({
      handler: topUsersHandler,
      params: {},
    });

    expect(myTrie.find('/users/tjkandala')).toStrictEqual({
      handler: namedUserHandler,
      params: {
        name: 'tjkandala',
      },
    });

    expect(myTrie.find('/users/tjkandala/likes')).toStrictEqual({
      handler: userLikesHandler,
      params: {
        name: 'tjkandala',
      },
    });

    expect(myTrie.find('/users/tjk/followers')).toStrictEqual({
      handler: userFollowersHandler,
      params: {
        name: 'tjk',
      },
    });

    expect(myTrie.find('/games')).toStrictEqual({
      handler: gamesHandler,
      params: {},
    });

    expect(myTrie.find('/games/sushigo')).toStrictEqual({
      handler: sushigoHandler,
      params: {},
    });

    // wildcard tests

    expect(myTrie.find('/games/boggle')).toStrictEqual({
      handler: gameWildcardHandler,
      params: {
        wildcard: 'boggle',
      },
    });

    expect(myTrie.find('/games/boggle/doggle')).toStrictEqual({
      handler: gameWildcardHandler,
      params: {
        wildcard: 'boggle/doggle',
      },
    });

    expect(myTrie.find('/lol')).toStrictEqual({
      handler: catchallHandler,
      params: {
        wildcard: 'lol',
      },
    });
  });

  test('works', () => {
    expect(true).toBe(true);
  });
});
