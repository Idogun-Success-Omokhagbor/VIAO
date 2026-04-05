const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const root = process.cwd()
const nextDir = path.join(root, ".next")
const layoutCss = path.join(nextDir, "static", "css", "app", "layout.css")

function removePath(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

function clearBrokenNextArtifacts() {
  if (!fs.existsSync(nextDir)) return

  const hasLayoutCss = fs.existsSync(layoutCss) && fs.statSync(layoutCss).size > 0
  if (hasLayoutCss) return

  console.warn("Dev startup: removing stale .next cache because app layout CSS is missing.")

  if (removePath(nextDir)) return

  const entries = fs.readdirSync(nextDir)
  for (const entry of entries) {
    const entryPath = path.join(nextDir, entry)
    if (!removePath(entryPath) && entry !== "trace") {
      console.warn(`Dev startup: could not remove stale Next artifact: ${entryPath}`)
    }
  }
}

function runBootstrapAdmin() {
  const scriptPath = path.join(root, "scripts", "bootstrap-admin.js")
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

clearBrokenNextArtifacts()
runBootstrapAdmin()
