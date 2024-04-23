import { describe, it, expect, vi } from "vitest";
import { ReadonlyRemitter } from "../src/main";

describe("ReadonlyEmitter", () => {
  it("should extends ReadonlyEmitter", () => {
    class MyEmitter extends ReadonlyRemitter<{ foo: string }> {
      public emitFoo() {
        this.emit("foo", "bar");
      }
    }

    const emitter = new MyEmitter();
    const listener = vi.fn();
    emitter.on("foo", listener);
    emitter.emitFoo();

    expect(listener).toBeCalledTimes(1);
    expect(listener).lastCalledWith("bar");
  });
});
