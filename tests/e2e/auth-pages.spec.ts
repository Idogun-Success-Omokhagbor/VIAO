import { expect, test } from "@playwright/test"

test.describe("auth pages", () => {
  test("sign in page renders key controls", async ({ page }) => {
    await page.goto("/signin")

    await expect(page).toHaveTitle(/Viao/i)
    await expect(page.getByRole("heading", { name: "Sign in and get back to your plans." })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("reset password page renders flow entry point", async ({ page }) => {
    await page.goto("/reset-password")

    await expect(page.getByRole("heading", { name: "Reset your password." })).toBeVisible()
    await expect(page.getByLabel("Account email")).toBeVisible()
    await expect(page.getByRole("button", { name: "Send reset code" })).toBeVisible()
  })
})
