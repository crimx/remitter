import { describe, it, expect, vi } from "vitest";
import { Remitter } from "../src/main";

describe("basic usage", () => {
  it("should add listener", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.on("event1", spy);

    expect(remitter.has()).toBe(true);
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

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(0);

    disposer();
    expect(remitter.has()).toBe(false);

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

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(0);

    expect(remitter.off("event1", spy)).toBe(true);
    expect(remitter.has()).toBe(false);

    expect(remitter.off("event1", spy)).toBe(false);

    remitter.emit("event1", 1);
    expect(spy).toHaveBeenCalledTimes(0);

    // @ts-expect-error - no event2
    expect(remitter.off("event2", spy)).toBe(false);
  });

  it("should remove once listener", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.once("event1", spy);

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(0);

    expect(remitter.off("event1", spy)).toBe(true);
    expect(remitter.has()).toBe(false);
    expect(remitter.off("event1", spy)).toBe(false);

    remitter.emit("event1", 1);
    expect(spy).toHaveBeenCalledTimes(0);
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

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });

    remitter.emit("event1", 1);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });

    remitter.clear("event1");
    expect(remitter.has()).toBe(false);
    expect(remitter.has("event1")).toBe(false);

    remitter.emit("event1", 2);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });
  });

  it("should clear listeners of ANY_EVENT", () => {
    const spies = Array.from({ length: 10 }).map(() => vi.fn());
    const spyEvent1 = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    spies.forEach(spy => {
      remitter.onAny(spy);
    });
    remitter.on("event1", spyEvent1);

    expect(remitter.has()).toBe(true);
    expect(remitter.hasAny()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });
    expect(spyEvent1).toHaveBeenCalledTimes(0);

    remitter.emit("event1", 1);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith({
        data: 1,
        event: "event1",
      });
    });
    expect(spyEvent1).toHaveBeenCalledTimes(1);
    expect(spyEvent1).lastCalledWith(1);

    spies.forEach(spy => {
      spy.mockClear();
    });
    spyEvent1.mockClear();

    remitter.clearAny();
    expect(remitter.hasAny()).toBe(false);
    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);

    remitter.emit("event1", 2);
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });
    expect(spyEvent1).toHaveBeenCalledTimes(1);
    expect(spyEvent1).lastCalledWith(2);
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

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(remitter.has("event2")).toBe(true);
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
    expect(remitter.has()).toBe(false);
    expect(remitter.has("event1")).toBe(false);
    expect(remitter.has("event2")).toBe(false);

    remitter.emit("event1", 2);
    spies1.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });
    spies2.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  it("should once", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.once("event1", spy);

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(0);

    remitter.emit("event1", 1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).lastCalledWith(1);
    expect(remitter.has()).toBe(false);
    expect(remitter.has("event1")).toBe(false);

    spy.mockClear();

    remitter.emit("event1", 2);
    expect(remitter.has()).toBe(false);
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should dispose listener", () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    const disposer1 = remitter.on("event1", spy1);
    const disposer2 = remitter.once("event1", spy2);

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);

    disposer2();
    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(remitter.off("event1", spy2)).toBe(false);

    disposer1();
    expect(remitter.has()).toBe(false);
    expect(remitter.has("event1")).toBe(false);
    expect(remitter.off("event1", spy1)).toBe(false);

    remitter.emit("event1", 1);
    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);
  });

  it("should release all listeners on disposed", () => {
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

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(remitter.has("event2")).toBe(true);
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

    remitter.dispose();
    expect(remitter.has()).toBe(false);
    expect(remitter.has("event1")).toBe(false);
    expect(remitter.has("event2")).toBe(false);

    remitter.emit("event1", 2);
    spies1.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).lastCalledWith(1);
    });
    spies2.forEach(spy => {
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  it("should add same listener for both normal and once", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.on("event1", spy);
    remitter.once("event1", spy);

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(0);

    remitter.emit("event1", 1);
    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).lastCalledWith(1);

    spy.mockClear();

    remitter.emit("event1", 2);
    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).lastCalledWith(2);
  });

  it("should off both normal and once listener if they are the same", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.on("event1", spy);
    remitter.once("event1", spy);

    expect(remitter.has()).toBe(true);
    expect(remitter.has("event1")).toBe(true);
    expect(spy).toHaveBeenCalledTimes(0);

    remitter.off("event1", spy);

    expect(remitter.has()).toBe(false);
    expect(remitter.has("event1")).toBe(false);
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("should listen to any event", () => {
    const spy = vi.fn();

    interface RemitterConfig {
      event1: number;
    }
    const remitter = new Remitter<RemitterConfig>();
    remitter.onAny(spy);
    remitter.onceAny(spy);

    expect(remitter.has()).toBe(true);
    expect(remitter.has(remitter.ANY_EVENT)).toBe(true);
    expect(remitter.has("event1")).toBe(false);
    expect(spy).toHaveBeenCalledTimes(0);

    remitter.emit("event1", 1);
    expect(remitter.has()).toBe(true);
    expect(remitter.has(remitter.ANY_EVENT)).toBe(true);
    expect(remitter.hasAny()).toBe(true);
    expect(remitter.has("event1")).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).lastCalledWith({ event: "event1", data: 1 });

    spy.mockClear();

    remitter.emit("event1", 2);
    expect(remitter.has()).toBe(true);
    expect(remitter.has(remitter.ANY_EVENT)).toBe(true);
    expect(remitter.hasAny()).toBe(true);
    expect(remitter.has("event1")).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).lastCalledWith({ event: "event1", data: 2 });

    spy.mockClear();

    remitter.offAny(spy);

    remitter.emit("event1", 2);
    expect(remitter.has()).toBe(false);
    expect(remitter.has(remitter.ANY_EVENT)).toBe(false);
    expect(remitter.hasAny()).toBe(false);
    expect(remitter.has("event1")).toBe(false);
    expect(spy).toHaveBeenCalledTimes(0);
  });
});
