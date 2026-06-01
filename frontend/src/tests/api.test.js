import { describe, it, expect } from "vitest";

describe("api module", () => {
  it("exports a default axios instance", async () => {
    const module = await import("../api");
    const api = module.default;
    expect(api).toBeDefined();
    expect(typeof api.get).toBe("function");
    expect(typeof api.post).toBe("function");
    expect(typeof api.delete).toBe("function");
  });

  it("exports API_BASE_URL", async () => {
    const { API_BASE_URL } = await import("../api");
    expect(typeof API_BASE_URL).toBe("string");
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  it("base URL includes /api path", async () => {
    const api = (await import("../api")).default;
    expect(api.defaults.baseURL).toMatch(/\/api$/);
  });
});
