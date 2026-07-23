import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import Drawer from "./Drawer";
import ErrorState from "./ErrorState";
import ConfirmDialog from "./ConfirmDialog";
import ToastContainer from "./ToastContainer";
import { ConfirmProvider, useConfirm } from "../contexts/ConfirmContext";
import { ToastProvider, useToast } from "../contexts/ToastContext";

// axe-core's full scan (real DOM traversal + rule evaluation) is comparatively
// slow — the default 5s test timeout is fine on an idle machine but too tight
// under CPU contention, so every test here gets a longer one explicitly.
const AXE_TEST_TIMEOUT = 20_000;

/** Automated axe-core sweeps for the shared building blocks every page composes from. A violation here means every page using that primitive inherits the same defect. */
describe("Accessibility: shared primitives (axe-core)", () => {
  it("Drawer has no axe violations when open with a form inside", async () => {
    const { container } = render(
      <Drawer open onClose={() => {}} title="Add a department">
        <div className="p-8">
          <label htmlFor="name">Name</label>
          <input id="name" />
          <button type="button">Save</button>
        </div>
      </Drawer>,
    );
    expect(await axe(container)).toHaveNoViolations();
  }, AXE_TEST_TIMEOUT);

  it("ErrorState with a retry button has no axe violations", async () => {
    const { container } = render(<ErrorState message="Couldn't load employees." onRetry={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  }, AXE_TEST_TIMEOUT);

  it("ConfirmDialog (alertdialog) has no axe violations when open", async () => {
    function Harness() {
      const confirm = useConfirm();
      useState(() => {
        void confirm({ title: "Delete this record?", description: "This can't be undone.", tone: "danger" });
      });
      return <ConfirmDialog />;
    }
    const { container, findByRole } = render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );
    await findByRole("alertdialog");
    expect(await axe(container)).toHaveNoViolations();
  }, AXE_TEST_TIMEOUT);

  it("ToastContainer with a mix of toast types has no axe violations", async () => {
    function Harness() {
      const toast = useToast();
      useState(() => {
        toast.success("Saved");
        toast.error("Could not save", "Network timeout");
      });
      return <ToastContainer />;
    }
    const { container, findByText } = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await findByText("Saved");
    expect(await axe(container)).toHaveNoViolations();
  }, AXE_TEST_TIMEOUT);
});
