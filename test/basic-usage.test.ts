import { describe, it, expect, vi } from "vitest";
import { Remitter } from "../src/remitter";

describe("basic usage", () => {
  it("should add listener", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.on("event1", spy);

    expect(remitter.count()).toBe(1);
    expect(remitter.count("event1")).toBe(1);
    expect(spy).toHaveBeenCalledTimes(0);

    remitter.emit("event1", 1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).lastCalledWith(1);
  });

  it("should dispose listener", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    const disposer = remitter.on("event1", spy);

    expect(remitter.count()).toBe(1);
    expect(remitter.count("event1")).toBe(1);
    expect(spy).toHaveBeenCalledTimes(0);

    disposer();
    expect(remitter.count()).toBe(0);

    remitter.emit("event1", 1);
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should emit empty data", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: void;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.on("event1", spy);

    remitter.emit("event1");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).lastCalledWith(undefined);
  });

  it("should remove listener", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.on("event1", spy);

    expect(remitter.count()).toBe(1);
    expect(remitter.count("event1")).toBe(1);
    expect(spy).toHaveBeenCalledTimes(0);

    expect(remitter.off("event1", spy)).toBe(true);
    expect(remitter.count()).toBe(0);

    expect(remitter.off("event1", spy)).toBe(false);

    remitter.emit("event1", 1);
    expect(spy).toHaveBeenCalledTimes(0);

    // @ts-expect-error - no event2
    expect(remitter.off("event2", spy)).toBe(false);
  });

  it("should clear listeners of a event name", () => {
    const spies = Array.from({ length: 10 }).map(() => vi.fn());

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    spies.forEach(spy => {
      remitter.on("event1", spy);
    });

    expect(remitter.count()).toBe(spies.length);
    expect(remitter.count("event1")).toBe(spies.length);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });

    remitter.emit("event1", 1);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });

    remitter.clear("event1");
    expect(remitter.count()).toBe(0);

    remitter.emit("event1", 2);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });
  });

  it("should clear all listeners", () => {
    const spies1 = Array.from({ length: 10 }).map(() => vi.fn());
    const spies2 = Array.from({ length: 20 }).map(() => vi.fn());

    interface RemitterConfig {
      event1: number;
      event2: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    spies1.forEach(spy => {
      remitter.on("event1", spy);
    });
    spies2.forEach(spy => {
      remitter.on("event2", spy);
    });

    expect(remitter.count()).toBe(spies1.length + spies2.length);
    expect(remitter.count("event1")).toBe(spies1.length);
    expect(remitter.count("event2")).toBe(spies2.length);
    spies1.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });
    spies2.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });

    remitter.emit("event1", 1);
    spies1.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });
    spies2.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });

    remitter.clear();
    expect(remitter.count()).toBe(0);
    expect(remitter.count("event1")).toBe(0);
    expect(remitter.count("event2")).toBe(0);

    remitter.emit("event1", 2);
    spies1.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });
    spies2.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  it("should destroy", () => {
    const spies1 = Array.from({ length: 10 }).map(() => vi.fn());
    const spies2 = Array.from({ length: 20 }).map(() => vi.fn());

    interface RemitterConfig {
      event1: number;
      event2: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    spies1.forEach(spy => {
      remitter.on("event1", spy);
    });
    spies2.forEach(spy => {
      remitter.on("event2", spy);
    });

    expect(remitter.count()).toBe(spies1.length + spies2.length);
    expect(remitter.count("event1")).toBe(spies1.length);
    expect(remitter.count("event2")).toBe(spies2.length);
    spies1.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });
    spies2.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });

    remitter.emit("event1", 1);
    spies1.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });
    spies2.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });

    remitter.destroy();
    expect(remitter.count()).toBe(0);
    expect(remitter.count("event1")).toBe(0);
    expect(remitter.count("event2")).toBe(0);

    remitter.emit("event1", 2);
    spies1.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });
    spies2.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });
});
