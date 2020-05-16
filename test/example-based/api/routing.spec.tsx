/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { RouTrie } from '../../../src/router';
import { SFC, machine } from '../../../src/component';
import { b, createRouter, linkTo, mount } from '../../../src/index';
import { machineRegistry } from '../../../src/machineRegistry';

describe('router', () => {
  let $root = document.body;
  test('machine unmount on route change', () => {
    const HomeMachine = machine({
      id: 'home',
      context: () => ({}),
      initial: 'here',
      when: {
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

    // for now, null return from render fn is an empty text node,
    // so this assertion would fail
    // expect($root.childNodes.length).toBe(0);

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

    myTrie.i('/', homeHandler);
    myTrie.i('/users', usersHandler);
    myTrie.i('/users/top', topUsersHandler);
    myTrie.i('/users/:name', namedUserHandler);
    myTrie.i('/users/:name/likes', userLikesHandler);
    myTrie.i('/users/:name/followers', userFollowersHandler);
    myTrie.i('/games', gamesHandler);
    myTrie.i('/games/sushigo', sushigoHandler);
    myTrie.i('/games/*', gameWildcardHandler);
    myTrie.i('*', catchallHandler);

    expect(myTrie.f('/')).toStrictEqual({
      h: homeHandler,
      p: {},
    });

    expect(myTrie.f('/users')).toStrictEqual({
      h: usersHandler,
      p: {},
    });

    expect(myTrie.f('/users/top')).toStrictEqual({
      h: topUsersHandler,
      p: {},
    });

    expect(myTrie.f('/users/tjkandala')).toStrictEqual({
      h: namedUserHandler,
      p: {
        name: 'tjkandala',
      },
    });

    expect(myTrie.f('/users/tjkandala/likes')).toStrictEqual({
      h: userLikesHandler,
      p: {
        name: 'tjkandala',
      },
    });

    expect(myTrie.f('/users/tjk/followers')).toStrictEqual({
      h: userFollowersHandler,
      p: {
        name: 'tjk',
      },
    });

    expect(myTrie.f('/games')).toStrictEqual({
      h: gamesHandler,
      p: {},
    });

    expect(myTrie.f('/games/sushigo')).toStrictEqual({
      h: sushigoHandler,
      p: {},
    });

    // wildcard tests

    expect(myTrie.f('/games/boggle')).toStrictEqual({
      h: gameWildcardHandler,
      p: {
        wildcard: 'boggle',
      },
    });

    expect(myTrie.f('/games/boggle/doggle')).toStrictEqual({
      h: gameWildcardHandler,
      p: {
        wildcard: 'boggle/doggle',
      },
    });

    expect(myTrie.f('/lol')).toStrictEqual({
      h: catchallHandler,
      p: {
        wildcard: 'lol',
      },
    });
  });

  test('works', () => {
    expect(true).toBe(true);
  });
});
