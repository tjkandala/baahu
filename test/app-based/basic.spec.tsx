import baahu, { SFC, b, createMachine, memoInstance } from '../../src';
import { machineRegistry } from '../../src/machineRegistry';

describe('basic apps', () => {
  let $root = document.body;

  test('simple video app', () => {
    /**
     *
     *  goals:
     *
     * - check if child is same for leaf nodes when they don't render!
     * - both memoInstance and isLeaf are tested here! (count renders for memoized fn)
     * - test cond
     *
     * - include a parent machine and leaf machines
     * - include both reusable machines and singleton machines (like home)
     *
     */
    const { mount, emit, createRouter, linkTo } = baahu<
      AppEvent,
      MachineList
    >();

    const MyRouter = createRouter({
      '/': () => <Home />,
      '/videos': () => <VideoList initialCategory={'sports'} />,
    });

    const App: SFC = () => (
      <div>
        <h1>baahu video app</h1>
        <MyRouter />
        <MyFooter path={location.pathname} />
      </div>
    );

    const footerRenders: string[] = [];

    const MyFooter = memoInstance<{ path: string }>(({ path }) => {
      footerRenders.push('render');
      return <h3>{path}</h3>;
    });

    // using arrays to define machines and states
    //  so we can iterate through them for tests
    const machineList = ['Home', 'VideoList', 'Video', 'Profile'] as const;

    type MachineList = typeof machineList[number];

    const Home = createMachine<{}, HomeState, HomeEvent, {}>({
      isLeaf: true,
      id: 'Home',
      initialState: 'loading',
      initialContext: () => ({}),
      states: {
        loading: {
          on: {
            LOADED_CATEGORIES: {
              target: 'loaded',
            },
          },
        },
        loaded: {},
      },
      render: state => {
        switch (state) {
          case 'loading':
            return (
              <div>
                <button
                  onClick={() => emit({ type: 'LOADED_CATEGORIES' }, 'Home')}
                >
                  load
                </button>
              </div>
            );

          case 'loaded':
            return (
              <div>
                <button onClick={() => linkTo('/videos')}>
                  go to video list
                </button>
              </div>
            );
        }
      },
    });

    // videolist is parent + static/singleton
    // video is leaf + dynamic/many instances
    const VideoList = createMachine<
      VideoListProps,
      VideoListState,
      VideoListEvent,
      VideoListContext
    >({
      isLeaf: false,
      id: 'VideoList',
      initialState: 'loading',
      initialContext: props => ({
        category: props.initialCategory,
      }),
      states: {
        loading: {
          on: {
            LOADED_VIDEOS: {
              target: 'loaded',
            },
          },
        },
        loaded: {
          on: {
            CHANGE_CATEGORY: {
              target: 'loading',
              effects: [(ctx, e) => (ctx.category = e.category)],
              cond: (ctx, e) => ctx.category !== e.category,
            },
          },
        },
      },
      render: (state, { category }) => {
        switch (state) {
          case 'loading':
            return (
              <div>
                <p>loading videos</p>
              </div>
            );
          case 'loaded':
            return (
              <div>
                <h2>category: {category}</h2>
                <Video category={category} listPosition={1} />
                <Video category={category} listPosition={2} />
                <Video category={category} listPosition={3} />
                <br />
                <div>
                  <h3>change category</h3>
                  {videoListCategory.map(category => (
                    <button
                      onClick={() =>
                        emit({ type: 'CHANGE_CATEGORY', category })
                      }
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            );
        }
      },
    });

    const Video = createMachine<VideoProps, VideoState, VideoEvent, {}>({
      isLeaf: true,
      id: props => `video-${props.category}-${props.listPosition}`,
      initialContext: () => ({}),
      initialState: 'buffering',
      states: {
        buffering: {
          on: {
            CAN_PLAY: {
              target: 'playing',
            },
          },
        },
        playing: {
          on: {
            NEEDS_TO_BUFFER: {
              target: 'buffering',
            },
            PAUSE: {
              target: 'paused',
            },
          },
        },
        paused: {
          on: {
            PLAY: {
              target: 'playing',
            },
          },
        },
      },
      render: state => {
        switch (state) {
          case 'buffering':
            return <p>buffering</p>;

          case 'playing':
            return <p>playing</p>;

          case 'paused':
            return <p>paused</p>;
        }
      },
    });

    $root = mount(App, $root);

    /**
     * SCRIPTING USER INTERACTION
     */

    expect(footerRenders.length).toBe(1);

    expect($root.firstChild?.nodeName).toBe('H1');
    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('BUTTON');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe('load');

    // don't respond to this
    emit({ type: 'LOADED_VIDEOS' }, 'Home');

    expect(footerRenders.length).toBe(1);

    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('BUTTON');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe('load');

    emit({ type: 'LOADED_CATEGORIES' }, 'Home');

    expect(footerRenders.length).toBe(1);

    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('BUTTON');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe(
      'go to video list'
    );

    linkTo('/videos');

    expect(footerRenders.length).toBe(2);

    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('P');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe(
      'loading videos'
    );

    emit({ type: 'LOADED_VIDEOS' });

    expect(footerRenders.length).toBe(2);

    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('H2');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe(
      `category: `
    );
    expect($root.childNodes[1]?.firstChild?.childNodes[1]?.nodeValue).toBe(
      `sports`
    );
    // first video node
    expect($root.childNodes[1]?.childNodes[1]?.nodeName).toBe(`P`);
    expect($root.childNodes[1]?.childNodes[1]?.firstChild?.nodeValue).toBe(
      `buffering`
    );
    // second video node
    expect($root.childNodes[1]?.childNodes[2]?.nodeName).toBe(`P`);
    expect($root.childNodes[1]?.childNodes[2]?.firstChild?.nodeValue).toBe(
      `buffering`
    );

    // should't change anything
    emit({ type: 'CHANGE_CATEGORY', category: 'sports' });

    // first video node
    expect($root.childNodes[1]?.childNodes[1]?.nodeName).toBe(`P`);
    expect($root.childNodes[1]?.childNodes[1]?.firstChild?.nodeValue).toBe(
      `buffering`
    );
    // second video node
    expect($root.childNodes[1]?.childNodes[2]?.nodeName).toBe(`P`);
    expect($root.childNodes[1]?.childNodes[2]?.firstChild?.nodeValue).toBe(
      `buffering`
    );

    const firstLeafNodeBefore = machineRegistry.get('video-sports-1')
      ?.lastChild;
    const secondLeafNodeBefore = machineRegistry.get('video-sports-2')
      ?.lastChild;

    /**
     *
     * should change the second video node only (DO LEAF TEST HERE)
     *
     */
    emit({ type: 'CAN_PLAY' }, `video-sports-2`);

    expect($root.childNodes[1]?.childNodes[1]?.nodeName).toBe(`P`);
    expect($root.childNodes[1]?.childNodes[1]?.firstChild?.nodeValue).toBe(
      `buffering`
    );
    // second video node
    expect($root.childNodes[1]?.childNodes[2]?.nodeName).toBe(`P`);
    expect($root.childNodes[1]?.childNodes[2]?.firstChild?.nodeValue).toBe(
      `playing`
    );

    const firstLeafNodeAfter = machineRegistry.get('video-sports-1')?.lastChild;
    const secondLeafNodeAfter = machineRegistry.get('video-sports-2')
      ?.lastChild;

    // we don't want this to rerender, so reference to child should be the same
    expect(firstLeafNodeBefore === firstLeafNodeAfter).toBe(true);
    // we want this to rerender, so reference to child should NOT be the same
    expect(secondLeafNodeBefore === secondLeafNodeAfter).toBe(false);

    /**
     *
     *  this should change the videolist state
     *
     * */
    emit({ type: 'CHANGE_CATEGORY', category: 'tech' });

    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('P');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe(
      'loading videos'
    );

    emit({ type: 'LOADED_VIDEOS' });

    expect(footerRenders.length).toBe(2);

    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('H2');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe(
      `category: `
    );
    expect($root.childNodes[1]?.firstChild?.childNodes[1]?.nodeValue).toBe(
      `tech`
    );
    // first video node
    expect($root.childNodes[1]?.childNodes[1]?.nodeName).toBe(`P`);
    expect($root.childNodes[1]?.childNodes[1]?.firstChild?.nodeValue).toBe(
      `buffering`
    );
    // second video node. should come back to buffering (new instance)
    expect($root.childNodes[1]?.childNodes[2]?.nodeName).toBe(`P`);
    expect($root.childNodes[1]?.childNodes[2]?.firstChild?.nodeValue).toBe(
      `buffering`
    );

    /**
     *
     * go back home
     *
     */
    linkTo('/');

    expect(footerRenders.length).toBe(3);

    expect($root.firstChild?.nodeName).toBe('H1');
    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('BUTTON');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe('load');

    /**
     *
     * go back to /videos. videolist should be loading
     *
     */
    linkTo('/videos');

    expect(footerRenders.length).toBe(4);

    expect($root.childNodes[1]?.firstChild?.nodeName).toBe('P');
    expect($root.childNodes[1]?.firstChild?.firstChild?.nodeValue).toBe(
      'loading videos'
    );
  });
});

type AppEvent = HomeEvent | VideoListEvent | VideoEvent;

const homeState = ['loading', 'loaded'] as const;
type HomeState = typeof homeState[number];
type HomeEvent = { type: 'LOADED_CATEGORIES' };

const videoListState = ['loading', 'loaded'] as const;
type VideoListProps = {
  initialCategory: VideoListCategory;
};
type VideoListState = typeof videoListState[number];

const videoListCategory = ['comedy', 'action', 'sports', 'tech'] as const;
type VideoListCategory = typeof videoListCategory[number];

type VideoListContext = {
  category: VideoListCategory;
};
type VideoListEvent =
  | { type: 'LOADED_VIDEOS' }
  | { type: 'CHANGE_CATEGORY'; category: VideoListCategory };

type VideoProps = {
  listPosition: number;
  category: VideoListCategory;
};
const videoState = ['buffering', 'playing', 'paused'] as const;
type VideoState = typeof videoState[number];
type VideoEvent =
  | { type: 'CAN_PLAY' }
  | { type: 'NEEDS_TO_BUFFER' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' };
