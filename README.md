<p align="center">
<img src="https://user-images.githubusercontent.com/37420160/82601152-18f2bd00-9b7d-11ea-9188-a60d70518bb5.png" alt="Baahu" width="720"/>
  </p>
  
  <br>

<p align="center" style="border-top: 1px solid black">
  <a href='https://coveralls.io/github/tjkandala/baahu?branch=master'><img src='https://coveralls.io/repos/github/tjkandala/baahu/badge.svg?branch=master&service=github' alt='Coverage Status' /></a>
  <a href="https://unpkg.com/baahu/dist/baahu.cjs.production.min.js">
  <img src="http://img.badgesize.io/https://unpkg.com/baahu/dist/baahu.cjs.production.min.js?compression=gzip&label=gzip" alt="gzip size" />
  </a> 
  <a href="https://unpkg.com/baahu/dist/baahu.cjs.production.min.js">
  <img src="http://img.badgesize.io/https://unpkg.com/baahu/dist/baahu.cjs.production.min.js?compression=brotli&label=brotli" alt="brotli size" />
  </a>
  <a>
  <img src="https://img.shields.io/github/languages/top/tjkandala/baahu" alt="GitHub top language" />
  </a>
  <a>
  <img src="https://img.shields.io/github/license/tjkandala/baahu" alt="license" />
  </a>
  <a>
  <img src="https://img.shields.io/github/issues/tjkandala/baahu" alt="GitHub issues" />
  </a>
  <a>
  <img src="https://img.shields.io/badge/go%20to-docs-blue" alt="read the documentation" />
  </a>
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/tjkandala/baahu/CI">
</p>


[3.8 kb](https://bundlephobia.com/result?p=baahu@0.10.2) batteries-included UI framework / web app SDK (once it has a cli)

dx strengths

- TODO
- predictable rerendering.
- embraces the nature of javascript, leading to more straightforward code and better performance.
  you can mutate objects, baahu doesn't care. you don't need immer to TODO.
  mutate if you want to, create new objects if you want to; baahu will work either way
- includes the essentials for building interactive web apps, limiting the amount of dependencies you need. baahu itself has zero runtime dependencies.
- UI components are state machines; making them explicit
- first-class TypeScript and JSX support

technical strengths

- state machine components that only rerender (as in computing virtual nodes, let alone DOM nodes) themselves, not their parents or children, on events\* Enabled by the event-based architecture, as opposed to the prop-based architecture of React.
- message passing model inspired by (but is not quite) the [actor model](https://en.wikipedia.org/wiki/Actor_model)
- built-in router similar to a [radix tree](https://en.wikipedia.org/wiki/Radix_tree)
- uses a fast keyed list diff algorithm [(from ivi)](https://github.com/localvoid/ivi)
- optimized for modern js engines (hidden classes, etc. more monomorphic call sites)
- only 3.8kb
- baahu has undergone property based testing with [fastcheck](https://github.com/dubzzz/fast-check)

### caveats TODO

- while re-rendering in baahu is more granular than in most frameworks, you can go deeper. for reference: solidjs (link)
- may not perform as well on very old browsers due to reliance on es6 maps

### sections of docs

- What is baahu? why does it exist?

- learn by doing (build your own twitter, make a real-time multiplayer game)
- learn the concepts

FAQ:

- when does baahu rerender? what does it rerender?
