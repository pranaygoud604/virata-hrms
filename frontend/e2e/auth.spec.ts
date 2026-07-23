import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@virata-hr.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe123!";

test.describe("Authentication", () => {
  test("renders the login form with required fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Virata HR" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("blocks submission via the browser's native required-field validation when fields are empty", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Native HTML5 validation prevents the form from ever submitting, so we're
    // still on the login page with no server round-trip having happened.
    await expect(page).toHaveURL(/\/login$/);
    const emailValidity = await page.getByLabel("Email").evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(emailValidity).toBe(false);
  });

  test("shows an error message for invalid credentials without leaking backend details", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@virata-hr.local");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText("Invalid email or password.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("logs in successfully with valid credentials and lands on the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Virata Interior")).toBeVisible();
  });

  test("logging out clears the session and blocks access to protected routes", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // A direct navigation attempt to a protected route while logged out must
    // bounce back to /login, not render the page underneath.
    await page.goto("/employees");
    await expect(page).toHaveURL(/\/login$/);
  });
});
