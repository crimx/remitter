import { describe, it, expect, vi } from "vitest";
import { Remitter } from "../src/remitter";

describe("tap", () => {
  it("should run prepare when first listener is added", () => {
    const spy1Disposer = vi.fn();
    const spy1 = vi.fn(() => spy1Disposer);
    const spy2Disposer = vi.fn();
    const spy2 = vi.fn(() => spy2Disposer);
    const spy3 = vi.fn();
    const remitter = new Remitter<{ event1: number }>();

    remitter.tap("event1", spy1);

    // @ts-expect-error - no event2
    remitter.tap("event2", spy2);

    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);
    expect(spy2Disposer).toHaveBeenCalledTimes(0);

    remitter.emit("event1", 1);

    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);
    expect(spy2Disposer).toHaveBeenCalledTimes(0);

    remitter.on("event1", spy3);

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);
    expect(spy2Disposer).toHaveBeenCalledTimes(0);

    expect(spy1).lastCalledWith();
    expect(spy3).toHaveBeenCalledTimes(0);

    spy1.mockClear();

    remitter.off("event1", spy3);

    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy1Disposer).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(0);
    expect(spy2Disposer).toHaveBeenCalledTimes(0);

    expect(spy1Disposer).lastCalledWith();
    expect(spy3).toHaveBeenCalledTimes(0);
  });

  it("should dispose tap", () => {
    const spy1Disposer = vi.fn();
    const spy1 = vi.fn(() => spy1Disposer);

    const remitter = new Remitter<{
      event1: number;
    }>();

    const dispose1 = remitter.tap("event1", spy1);

    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);

    dispose1();

    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);

    const spy2 = vi.fn();
    remitter.on("event1", spy2);

    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);

    remitter.off("event1", spy2);

    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);

    const dispose2 = remitter.tap("event1", spy1);

    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);

    remitter.on("event1", spy2);

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy1Disposer).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);

    dispose2();

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy1Disposer).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(0);

    remitter.off("event1", spy2);

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy1Disposer).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(0);
  });
});
