import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorState from "./ErrorState";

describe("ErrorState", () => {
  it("renders the default message when none is given", () => {
    render(<ErrorState />);
    expect(screen.getByText("Couldn't load this data.")).toBeInTheDocument();
  });

  it("renders a custom message", () => {
    render(<ErrorState message="Couldn't load employees." />);
    expect(screen.getByText("Couldn't load employees.")).toBeInTheDocument();
  });

  it("announces itself to assistive tech via role=alert", () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
  });

  it("does not render a retry button when onRetry is omitted", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("renders a retry button and calls onRetry when clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
