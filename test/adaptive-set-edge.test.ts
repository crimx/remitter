import { afterEach, describe, expect, it, vi } from "vitest";

describe("adaptive set edge cases", () => {
  afterEach(() => {
    vi.doUnmock("adaptive-set");
    vi.resetModules();
  });

  it("should remove listener if adaptive-set remove returns undefined", async () => {
    let shouldDropOnRemove = false;

    vi.resetModules();
    vi.doMock("adaptive-set", async (importOriginal) => {
      const actual = await importOriginal<typeof import("adaptive-set")>();

      return {
        ...actual,
        remove: vi.fn((col: Parameters<typeof actual.remove>[0], value: Parameters<typeof actual.remove>[1]) =>
          shouldDropOnRemove ? undefined : actual.remove(col, value),
        ),
      };
    });

    const { Remitter } = await import("../src/remitter");

    const spy = vi.fn();
    const remitter = new Remitter<{ event1: number }>();
    remitter.on("event1", spy);

    shouldDropOnRemove = true;
    remitter.off("event1", spy);

    expect(remitter.has()).toBe(false);
    expect(remitter.has("event1")).toBe(false);

    remitter.emit("event1", 1);

    expect(spy).toHaveBeenCalledTimes(0);
  });
});
