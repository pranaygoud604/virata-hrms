import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm } from "../contexts/ConfirmContext";
import ConfirmDialog from "./ConfirmDialog";

function Harness() {
  const confirm = useConfirm();
  const [result, setResult] = useState<string>("idle");

  async function ask() {
    const ok = await confirm({
      title: "Delete this department?",
      description: "This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    setResult(ok ? "confirmed" : "cancelled");
  }

  return (
    <>
      <button onClick={ask}>ask</button>
      <p>result: {result}</p>
      <ConfirmDialog />
    </>
  );
}

function renderHarness() {
  return render(
    <ConfirmProvider>
      <Harness />
    </ConfirmProvider>,
  );
}

describe("ConfirmDialog", () => {
  it("renders as an alertdialog with the title and description wired via aria-labelledby/aria-describedby", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("ask"));

    const dialog = await screen.findByRole("alertdialog");
    const titleId = dialog.getAttribute("aria-labelledby");
    const descId = dialog.getAttribute("aria-describedby");
    expect(document.getElementById(titleId!)).toHaveTextContent("Delete this department?");
    expect(document.getElementById(descId!)).toHaveTextContent("This can't be undone.");
  });

  it("resolves the confirm() promise to true when Confirm is clicked", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("ask"));
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.getByText("result: confirmed")).toBeInTheDocument());
  });

  it("resolves the confirm() promise to false when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("ask"));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByText("result: cancelled")).toBeInTheDocument());
  });

  it("resolves to false when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("ask"));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByText("result: cancelled")).toBeInTheDocument());
  });

  it("closes the dialog from the DOM after resolving", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("ask"));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
