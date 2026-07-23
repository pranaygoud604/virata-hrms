import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./ToastContext";
import ToastContainer from "../components/ToastContainer";

function Harness() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Saved", "Employee added")}>fire-success</button>
      <button onClick={() => toast.error("Failed", "Network error")}>fire-error</button>
      <button onClick={() => toast.show("success", "Quick", undefined, 50)}>fire-quick</button>
      <button
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(() => resolve("ok"), 300)), {
            loading: "Importing…",
            success: "Imported",
            error: "Import failed",
          })
        }
      >
        fire-promise
      </button>
      <ToastContainer />
    </>
  );
}

function renderHarness() {
  return render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
}

describe("ToastContext + ToastContainer", () => {
  it("shows a success toast with title and description", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("fire-success"));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Employee added")).toBeInTheDocument();
  });

  it("renders an error toast with role=alert so screen readers announce it immediately", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("fire-error"));
    const toastEl = screen.getByRole("alert");
    expect(toastEl).toHaveTextContent("Failed");
  });

  it("renders a non-error toast with role=status (polite, not assertive)", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("fire-success"));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("dismisses a toast when its close button is clicked", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("fire-success"));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByText("Saved")).not.toBeInTheDocument());
  });

  it("auto-dismisses a toast once its duration elapses", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("fire-quick"));
    expect(screen.getByText("Quick")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Quick")).not.toBeInTheDocument(), { timeout: 2000 });
  });

  it("promise() shows a loading toast and transitions it to success on resolution", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("fire-promise"));
    await waitFor(() => expect(screen.getByText("Importing…")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Imported")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.queryByText("Importing…")).not.toBeInTheDocument();
  });
});
