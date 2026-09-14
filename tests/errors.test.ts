import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toAppError } from "../src/errors/index.js";

describe("error translation", () => {
  it("translates 404", () => expect(toAppError({ status: 404 }).message).toContain("no fue encontrado"));
  it("translates invalid credentials", () => expect(toAppError({ status: 401 }).kind).toBe("AuthenticationError"));
  it("translates rate limiting", () => expect(toAppError({ status: 429 }).kind).toBe("RateLimitError"));
  it("distinguishes rate limiting from forbidden access", () => {
    expect(toAppError({ status: 403, response: { headers: { "x-ratelimit-remaining": "0" } } }).kind).toBe("RateLimitError");
    expect(toAppError({ status: 403 }).kind).toBe("AuthenticationError");
  });
  it("translates network failures", () => expect(toAppError(new TypeError("fetch failed")).kind).toBe("NetworkError"));
  it("translates Zod failures", () => expect(toAppError(z.object({ name: z.string() }).safeParse({}).error).kind).toBe("ValidationError"));
});