#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generates a changelog.json file from recent git commits.
 * Run before EAS update to embed commit history in the app.
 *
 * Usage: node scripts/generate-changelog.mjs [--count=10]
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const countArg = args.find((arg) => arg.startsWith("--count="));
const count = countArg ? parseInt(countArg.split("=")[1], 10) : 10;

const outputPath = join(__dirname, "..", "changelog.json");

try {
  // Get recent commits - use %ci for ISO date which works better cross-platform
  // Format: hash|shortHash|date|message (pipe-separated to avoid JSON escaping issues)
  // %H = full hash (for GitHub links), %h = short hash (for display)
  const gitLog = execSync(`git log --pretty=format:"%H|%h|%cs|%s" -${count}`, {
    encoding: "utf-8",
    cwd: join(__dirname, ".."),
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
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

  const changelog = {
    version: packageJson.version,
    generatedAt: new Date().toISOString(),
    commits,
  };

  writeFileSync(outputPath, JSON.stringify(changelog, null, 2));
  console.log(
    `Generated changelog with ${commits.length} commits at ${outputPath}`,
  );
} catch (error) {
  console.error("Failed to generate changelog:", error.message);
  process.exit(1);
}
