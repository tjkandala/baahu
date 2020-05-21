<p align="center">
<img src="https://user-images.githubusercontent.com/37420160/82601152-18f2bd00-9b7d-11ea-9188-a60d70518bb5.png" alt="Baahu" width="550"/>
  </p>

<br/>

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

---

## What is Baahu?

Baahu is a small zero-dependency state-machine-based SPA framework for Javascript + TypeScript

## Features

- [Faster and smaller than major frameworks/libraries]() (Svelte, Preact, Vue, React, and Angular)
- Built-in robust state management: Finite State Machines!
- Event-driven, not change-driven/reactive
- Built-in trie-based router & code-splitting
- First-class TypeScript support: type-checked JSX, props, states, events.
- Events only cause the targeted machine component to re-render; you don't have to memoize children

## Get Started

Everything you need to know about Baahu is in the docs!

## Example Components

You should read the docs, but if you want a sneak peek at what the API looks like, here a couple of example components:

### Toggle

```tsx
import { b, machine, emit } from 'baahu';

const Toggle = machine({
  id: 'toggle',
  initial: 'inactive',
  context: () => ({}),
  when: {
    inactive: { on: { TOGGLE: { to: 'active' } } },
    active: { on: { TOGGLE: { to: 'inactive' } } },
  },
  render: state => (
    <div>
      <h3>{state}</h3>
      <button onClick={() => emit({ type: 'TOGGLE' })}>Toggle</button>
    </div>
  ),
});
```

### Traffic Light

A traffic light component that doesn't let you cross the street when it is red, and displays the # of times you crossed the street.

```tsx
import { b, machine, emit } from 'baahu';

/**
 * you can make your own abstractions for
 * entry/exit/"do" actions. embracing js/ts keeps
 * baahu fast and light!
 */

function delayedEmit(event, delayMS) {
  /** returns a function that is called by baahu. emit the
   * provided event after the specified time */
  return () => setTimeout(() => emit(event, 'light'), delayMS);
}

const Light = machine({
  id: 'light',
  initial: 'red',
  context: () => ({
    streetsCrossed: 0,
  }),
  when: {
    red: {
      entry: delayedEmit({ type: 'START' }, 3000),
      on: {
        START: {
          to: 'green',
        },
        CROSS: {
          do: () => alert('JAYWALKING'),
        },
      },
    },
    yellow: {
      entry: delayedEmit({ type: 'STOP' }, 1500),
      on: {
        STOP: {
          to: 'red',
        },
        CROSS: {
          do: ctx => ctx.streetsCrossed++,
        },
      },
    },
    green: {
      entry: delayedEmit({ type: 'SLOW_DOWN' }, 2500),
      on: {
        SLOW_DOWN: {
          to: 'yellow',
        },
        CROSS: {
          do: ctx => ctx.streetsCrossed++,
        },
      },
    },
  },
  render: (state, ctx) => (
    <div>
      <h3>{state}</h3>
      {/* this is a targeted event: 
        only the machine with the specified
        id will be checked */}
      <button onClick={() => emit({ type: 'CROSS' }, 'light')}>
        Cross the Street
      </button>
      <p>Time(s) street crossed: {ctx.streetsCrossed}</p>
    </div>
  ),
});
```
