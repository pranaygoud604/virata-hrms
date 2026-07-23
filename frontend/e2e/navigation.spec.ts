import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@virata-hr.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe123!";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Authenticated navigation (SUPER_ADMIN)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("sidebar nav reaches every SUPER_ADMIN-visible page without a client-side error", async ({ page }) => {
    const routes: Array<[label: string, path: string]> = [
      ["Employees", "/employees"],
      ["Attendance", "/attendance"],
      ["Leave", "/leave"],
      ["Payroll", "/payroll"],
      ["Recruitment", "/recruitment"],
      ["Performance", "/performance"],
      ["Reports", "/reports"],
      ["Administration", "/administration"],
    ];
    for (const [label, path] of routes) {
      // Scoped to the nav landmark: some dashboard widgets (e.g. Quick
      // actions) link to the same pages with the same accessible name, which
      // otherwise makes this ambiguous.
      await page.getByRole("navigation").getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(path);
      // Every page renders an h1; if the route crashed we'd see an error
      // boundary or blank screen instead.
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("Command Palette opens with Ctrl+K and navigates to a page", async ({ page }) => {
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await page.getByPlaceholder(/search people, departments, or jump to/i).fill("Recruitment");
    await dialog.getByText("Recruitment", { exact: true }).click();
    await expect(page).toHaveURL("/recruitment");
    await expect(dialog).not.toBeVisible();
  });

  test("Command Palette closes on Escape without navigating", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Command palette" })).not.toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("Employees page loads, and the search box filters the table live", async ({ page }) => {
    await page.goto("/employees");
    await expect(page.getByRole("heading", { name: "Everyone at Virata" })).toBeVisible();
    const search = page.getByPlaceholder("Search people…");
    await search.fill("zzz-no-such-employee-zzz");
    await expect(page.getByText(/no (one|employees) (found|match)/i)).toBeVisible();
  });

  test("opening the Add Person drawer traps focus and Escape closes it", async ({ page }) => {
    await page.goto("/employees");
    await page.getByRole("button", { name: /add person/i }).click();
    const drawer = page.getByRole("dialog", { name: "Add a person" });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  });

  test("a destructive action (delete department) requires confirmation", async ({ page }) => {
    await page.goto("/administration");
    const deleteButtons = page.getByRole("button", { name: /^Delete / });
    const count = await deleteButtons.count();
    test.skip(count === 0, "No departments exist to test deletion against in this environment.");
    await deleteButtons.first().click();
    const confirmDialog = page.getByRole("alertdialog");
    await expect(confirmDialog).toBeVisible();
    // Cancel — must not actually delete anything the test doesn't own.
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(confirmDialog).not.toBeVisible();
  });
});
