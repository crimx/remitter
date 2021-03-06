# remitter

<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/crimx/remitter/main/assets/remitter.svg">
</p>

[![Build Status](https://github.com/crimx/remitter/actions/workflows/build.yml/badge.svg)](https://github.com/crimx/remitter/actions/workflows/build.yml)
[![npm-version](https://img.shields.io/npm/v/remitter.svg)](https://www.npmjs.com/package/remitter)
[![Coverage Status](https://img.shields.io/coveralls/github/crimx/remitter/main)](https://coveralls.io/github/crimx/remitter?branch=main)
[![minified-size](https://img.shields.io/bundlephobia/minzip/remitter)](https://bundlephobia.com/package/remitter)

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?maxAge=2592000)](http://commitizen.github.io/cz-cli/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-brightgreen.svg?maxAge=2592000)](https://conventionalcommits.org)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

A TypeScript friendly event emitter with easy re-emitting events.

## Install

```bash
npm add remitter
```

## Usage

```ts
import { Remitter } from "remitter";

interface EventConfig {
  event1: string;
  event2: void;
}

const remitter = new Remitter<EventConfig>();

const disposer = remitter.on("event1", value => {
  console.log("event1", value);
});

remitter.count("event1"); // 1

remitter.emit("event1", "hello"); // logs "event1 hello"

remitter.emit("event2"); // nothing logs

disposer();
remitter.emit("event1", "world"); // nothing logs

remitter.clear("event2"); // remove all listeners for event2
remitter.count(); // 0

remitter.destroy(); // removes all listeners and dispose tapped events
```

### Remit

You may tap into other events which will be lazy-executed when listener count of an event name grows from 0 to 1 and be disposed when listener count drops from 1 to 0.

```js
remitter.remit("event1", () => {
  const handler = e => {
    remitter.emit("event1", e.value + 1);
  };
  otherEvent.addListener(handler);
  return () => {
    otherEvent.removeListener(handler);
  };
});
```

The callback function can also be a pure function.

```js
const tapToOtherEvent = remitter => {
  const handler = e => {
    remitter.emit("event1", e.value + 1);
  };
  otherEvent.addListener(handler);
  return () => {
    otherEvent.removeListener(handler);
  };
};

remitter.remit("event1", tapToOtherEvent);
```

### Acknowledgment

Huge thanks to [@recursivefunk](https://github.com/recursivefunk) for giving away the NPM package name `remitter`.
