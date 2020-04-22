/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { RouTrie } from '../../src/router';

/**
 * TODO: Make an easy decoupled+nested router system!
 *
 * The idea: set a string for the root!  */

describe('router', () => {
  test('route changes update dom', () => {
    console.log(location.pathname);
    expect(true).toBe(true);
  });

  test('nested routers', () => {
    expect(true).toBe(true);
  });

  test('trie', () => {
    const myTrie = new RouTrie();

    /**
     * These routes demonstrate that regular routes are finded first,
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
