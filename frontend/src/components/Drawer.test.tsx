import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Drawer from "./Drawer";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>open-trigger</button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Add a department">
        <div className="p-8">
          <label htmlFor="dept-name">Name</label>
          <input id="dept-name" />
          <button>Save</button>
        </div>
      </Drawer>
    </>
  );
}

describe("Drawer", () => {
  it("is not in the document when closed", () => {
    render(<Drawer open={false} onClose={() => {}} title="Hidden">content</Drawer>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders as a labeled modal dialog when open", () => {
    render(<Drawer open onClose={() => {}} title="Add a department">content</Drawer>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(document.getElementById(labelId!)).toHaveTextContent("Add a department");
  });

  it("moves initial focus into the panel's first focusable field, not the close button", async () => {
    render(<Harness />);
    await userEvent.setup().click(screen.getByText("open-trigger"));
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveFocus());
  });

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} title="Add a department">content</Drawer>);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is activated", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} title="Add a department">content</Drawer>);
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the overlay behind the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<Drawer open onClose={onClose} title="Add a department">content</Drawer>);
    const overlay = container.querySelector('[aria-hidden="true"]')!;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the trigger element after closing", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByText("open-trigger");
    await user.click(trigger);
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("locks body scroll while open and restores it on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(document.body.style.overflow).not.toBe("hidden");
    await user.click(screen.getByText("open-trigger"));
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });
});
