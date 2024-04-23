# remitter

<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/crimx/remitter/main/assets/remitter.svg">
</p>

[![Docs](https://img.shields.io/badge/Docs-read-%23fdf9f5)](https://crimx.github.io/remitter)
[![Build Status](https://github.com/crimx/remitter/actions/workflows/build.yml/badge.svg)](https://github.com/crimx/remitter/actions/workflows/build.yml)
[![Coverage Status](https://img.shields.io/codeclimate/coverage/crimx/remitter)](https://codeclimate.com/github/crimx/remitter)

[![npm-version](https://img.shields.io/npm/v/remitter.svg)](https://www.npmjs.com/package/remitter)
[![minified-size](https://img.shields.io/bundlephobia/minzip/remitter)](https://bundlephobia.com/package/remitter)
[![no-dependencies](https://img.shields.io/badge/dependencies-none-success)](https://bundlejs.com/?q=remitter)
[![tree-shakable](https://img.shields.io/badge/tree-shakable-success)](https://bundlejs.com/?q=remitter)
[![side-effect-free](https://img.shields.io/badge/side--effect-free-success)](https://bundlejs.com/?q=remitter)

A tiny TypeScript friendly event emitter that supports lazy re-emitting events from other sources.

## Install

```bash
npm add remitter
```

## Usage

```ts
import { Remitter } from "remitter";

interface EventData {
  event1: string;
  event2: void;
}

const remitter = new Remitter<EventData>();

const disposer = remitter.on("event1", value => {
  console.log("event1", value);
});

remitter.once("event1", value => {
  console.log("event1-once", value);
});

remitter.has("event1"); // true

remitter.emit("event1", "hello"); // logs "event1 hello" and "event1-once hello"

remitter.emit("event1", "hello"); // logs "event1 hello"

remitter.emit("event2"); // nothing logs

disposer();
remitter.emit("event1", "world"); // nothing logs

remitter.clear("event2"); // remove all listeners for event2

remitter.has(); // false

remitter.dispose(); // removes all listeners and dispose tapped events
```

### Listen to any event

```ts
import { Remitter } from "remitter";

interface EventData {
  event1: string;
  event2: string;
}

const remitter = new Remitter<EventData>();

remitter.onAny(({ event, data }) => {
  console.log(event, data);
});

remitter.emit("event1", "hello"); // logs "event1 hello"
remitter.emit("event2", "world"); // logs "event2 world"
```

### Remit

You may tap into other events easily with `remit`. It is lazy-executed when listener count of the event name grows from 0 to 1. It is disposed when listener count of the event name drops from 1 to 0.

```js
remitter.remit("cursor", () => {
  const handler = ev => {
    remitter.emit("cursor", { x: ev.clientX, y: ev.clientY });
  };

  window.addEventListener("mousemove", handler);

  return () => {
    window.removeListener("mousemove", handler);
  };
});

// Remit callback does not execute until the first "cursor" listener is added
remitter.on("cursor", value => {
  console.log("cursor", value);
});

// Remit callback is disposed when no listener on the
// "cursor" event. (`window.removeListener` triggered)
remitter.clear("cursor");
```

The callback function can also be a pure function.

```js
const myCursorEvent = remitter => {
  const handler = ev => {
    remitter.emit("cursor", { x: ev.clientX, y: ev.clientY });
  };

  window.addEventListener("mousemove", handler);

  return () => {
    window.removeListener("mousemove", handler);
  };
};

remitter.remit("cursor", myCursorEvent);
```

### Acknowledgment

Huge thanks to [@recursivefunk](https://github.com/recursivefunk) for giving away the NPM package name `remitter`.
