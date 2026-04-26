const { readdirSync } = require("node:fs")
const { join } = require("node:path")
const { spawnSync } = require("node:child_process")

const testsDir = join(process.cwd(), "tests")
const testFiles = readdirSync(testsDir)
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => join("tests", file))

if (testFiles.length === 0) {
  console.error("No unit test files found in tests/")
  process.exit(1)
}

const result = spawnSync("npx", ["tsx", "--test", ...testFiles], {
  stdio: "inherit",
  shell: process.platform === "win32",
})

if (typeof result.status === "number") {
  process.exit(result.status)
}

process.exit(1)
