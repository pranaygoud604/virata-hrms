import { describe, expect, it } from "vitest";
import { extractErrorMessage } from "./apiError";

describe("extractErrorMessage", () => {
  it("extracts a plain string message from a NestJS-style axios error", () => {
    const err = { response: { data: { message: "Employee not found" } } };
    expect(extractErrorMessage(err)).toBe("Employee not found");
  });

  it("joins a class-validator array of messages", () => {
    const err = { response: { data: { message: ["firstName is required", "email must be valid"] } } };
    expect(extractErrorMessage(err)).toBe("firstName is required, email must be valid");
  });

  it("unwraps a doubly-nested message object", () => {
    const err = { response: { data: { message: { message: "Nested error" } } } };
    expect(extractErrorMessage(err)).toBe("Nested error");
  });

  it("unwraps a doubly-nested array of messages", () => {
    const err = { response: { data: { message: { message: ["a", "b"] } } } };
    expect(extractErrorMessage(err)).toBe("a, b");
  });

  it("falls back to a plain Error's message when there is no axios response shape", () => {
    expect(extractErrorMessage(new Error("Network down"))).toBe("Network down");
  });

  it("falls back to the default fallback for a totally unknown error shape", () => {
    expect(extractErrorMessage("just a string")).toBe("Something went wrong. Please try again.");
  });

  it("accepts a custom fallback message", () => {
    expect(extractErrorMessage(null, "Could not save changes")).toBe("Could not save changes");
  });

  it("falls back when the response has no message field at all", () => {
    const err = { response: { data: {} } };
    expect(extractErrorMessage(err)).toBe("Something went wrong. Please try again.");
  });
});
