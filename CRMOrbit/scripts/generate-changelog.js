#!/usr/bin/env node
/**
 * Generates a changelog.json file from recent git commits.
 * Run before EAS update to embed commit history in the app.
 *
 * Usage: node scripts/generate-changelog.js [--count=10]
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const countArg = args.find((arg) => arg.startsWith("--count="));
const count = countArg ? parseInt(countArg.split("=")[1], 10) : 10;

const outputPath = path.join(__dirname, "..", "changelog.json");

try {
  // Get recent commits - use %ci for ISO date which works better cross-platform
  // Format: hash|shortHash|date|message (pipe-separated to avoid JSON escaping issues)
  // %H = full hash (for GitHub links), %h = short hash (for display)
  const gitLog = execSync(`git log --pretty=format:"%H|%h|%cs|%s" -${count}`, {
    encoding: "utf-8",
    cwd: path.join(__dirname, ".."),
  });

  // Parse each line
  const commits = gitLog
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [fullHash, shortHash, date, ...messageParts] = line.split("|");
      const message = messageParts.join("|"); // In case message contains |
      if (fullHash && shortHash && date && message) {
        return { hash: shortHash, fullHash, date, message };
      }
      return null;
    })
    .filter(Boolean);

  // Get current version from package.json
  const packageJson = require("../package.json");

  const changelog = {
    version: packageJson.version,
    generatedAt: new Date().toISOString(),
    commits,
  };

  fs.writeFileSync(outputPath, JSON.stringify(changelog, null, 2));
  console.log(
    `Generated changelog with ${commits.length} commits at ${outputPath}`,
  );
} catch (error) {
  console.error("Failed to generate changelog:", error.message);
  process.exit(1);
}
