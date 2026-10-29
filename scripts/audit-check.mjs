import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { compareAudit, isFixableWithinMajor } from "./audit-compare.mjs";

const EXCEPTIONS_FILE = path.join(import.meta.dirname, "audit-exceptions.json");

// npm audit exits 1 as soon as one advisory exists, so the exit code says nothing: only stdout is read.
function runAudit() {
  const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 5 * 60 * 1000,
  });
  if (result.error) {
    return { report: null, error: result.error.message };
  }
  try {
    const report = JSON.parse(result.stdout);
    return { report, error: report?.message ?? null };
  } catch {
    return { report: null, error: `npm audit printed no JSON (exit ${result.status}): ${result.stderr.trim()}` };
  }
}

function describeUnlisted(advisory) {
  if (advisory.ghsa === null) {
    return [
      `- Advisory without GHSA (npm source ${advisory.source}) on ${advisory.package}, ${advisory.severity}: ${advisory.title}`,
      `  ${advisory.url}`,
      "  It cannot be listed as an exception: fix it, or change scripts/audit-compare.mjs.",
    ].join("\n");
  }
  const lines = [
    `- ${advisory.ghsa} on ${advisory.package}, ${advisory.severity}: ${advisory.title}`,
    `  ${advisory.url}`,
  ];
  if (isFixableWithinMajor(advisory.fixAvailable)) {
    lines.push("  Fixable: run `npm audit fix` (never --force) and commit the lock.");
  } else {
    const template = {
      ghsa: advisory.ghsa,
      package: advisory.package,
      path: "<npm explain>",
      severity: advisory.severity,
      reason: "<why it does not reach the installed app>",
    };
    lines.push(
      "  No fix within its major: after triage, add to scripts/audit-exceptions.json:",
      `  ${JSON.stringify(template)}`,
    );
  }
  return lines.join("\n");
}

const { report, error } = runAudit();
const { exceptions } = JSON.parse(readFileSync(EXCEPTIONS_FILE, "utf8"));
const result = compareAudit(report, exceptions);

if (result.unavailable) {
  console.error(`Audit unavailable: ${error ?? "npm audit returned no report"}`);
  console.error("Re-run the job.");
  process.exit(2);
}

if (result.unlisted.length === 0 && result.unused.length === 0) {
  console.log(`npm audit: no unlisted advisory at moderate or above (${exceptions.length} exceptions).`);
  process.exit(0);
}

console.error("This failure comes from today's advisory database, not from this diff.");
if (result.unlisted.length > 0) {
  console.error("\nAdvisories at moderate or above missing from scripts/audit-exceptions.json:");
  for (const advisory of result.unlisted) {
    console.error(describeUnlisted(advisory));
  }
}
if (result.unused.length > 0) {
  console.error("\nExceptions that match no advisory any more (fixed, or now below moderate): remove them.");
  for (const exception of result.unused) {
    console.error(`- ${exception.ghsa} on ${exception.package}`);
  }
}
process.exit(1);
