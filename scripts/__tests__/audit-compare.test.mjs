import { describe, expect, it } from "vitest";
import { compareAudit, isFixableWithinMajor } from "../audit-compare.mjs";

const CLEAN = { unavailable: false, unlisted: [], unused: [] };

const advisory = (name, ghsa, severity, extra = {}) => ({
  source: 1000,
  name,
  dependency: name,
  title: `${name} ${ghsa}`,
  url: `https://github.com/advisories/${ghsa}`,
  severity,
  range: "<9.9.9",
  ...extra,
});

const entry = (name, severity, via, fixAvailable = false) => ({ name, severity, via, fixAvailable });

const audit = (vulnerabilities) => ({ auditReportVersion: 2, vulnerabilities, metadata: {} });

const auditOf = (name, severity, via) => audit({ [name]: entry(name, severity, via) });

const listed = (ghsa, name) => ({ ghsa, package: name });

describe("compareAudit", () => {
  it("reports a moderate advisory missing from the exceptions (catches: unlisted advisory never reported)", () => {
    const result = compareAudit(
      audit({ zod: entry("zod", "moderate", [advisory("zod", "GHSA-aaaa-bbbb-cccc", "moderate")], true) }),
      [],
    );

    expect(result).toEqual({
      ...CLEAN,
      unlisted: [
        {
          ghsa: "GHSA-aaaa-bbbb-cccc",
          package: "zod",
          severity: "moderate",
          title: "zod GHSA-aaaa-bbbb-cccc",
          url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
          source: 1000,
          fixAvailable: true,
        },
      ],
    });
  });

  it("reports an exception that matches no advisory (catches: unused-exception check removed)", () => {
    const result = compareAudit(audit({}), [listed("GHSA-aaaa-bbbb-cccc", "zod")]);

    expect(result.unused).toEqual([listed("GHSA-aaaa-bbbb-cccc", "zod")]);
  });

  it("accepts a listed advisory (catches: listed advisory still reported)", () => {
    const result = compareAudit(auditOf("zod", "high", [advisory("zod", "GHSA-aaaa-bbbb-cccc", "high")]), [
      listed("GHSA-aaaa-bbbb-cccc", "zod"),
    ]);

    expect(result).toEqual(CLEAN);
  });

  it("ignores a low advisory missing from the exceptions (catches: threshold removed)", () => {
    const result = compareAudit(auditOf("deepmerge", "low", [advisory("deepmerge", "GHSA-gcqx-w48m-w2h4", "low")]), []);

    expect(result).toEqual(CLEAN);
  });

  it("reports an exception whose advisory is now low (catches: exception kept for an advisory below the threshold)", () => {
    const result = compareAudit(auditOf("deepmerge", "low", [advisory("deepmerge", "GHSA-gcqx-w48m-w2h4", "low")]), [
      listed("GHSA-gcqx-w48m-w2h4", "deepmerge"),
    ]);

    expect(result.unused).toEqual([listed("GHSA-gcqx-w48m-w2h4", "deepmerge")]);
  });

  it("reports an advisory of unknown severity (catches: unknown severity dropped as below the threshold)", () => {
    const result = compareAudit(auditOf("zod", "high", [advisory("zod", "GHSA-aaaa-bbbb-cccc", "severe")]), []);

    expect(result.unlisted.map(({ ghsa }) => ghsa)).toEqual(["GHSA-aaaa-bbbb-cccc"]);
  });

  it("ignores an entry that only propagates other packages' advisories (catches: string treated as an advisory)", () => {
    const result = compareAudit(auditOf("query-string", "moderate", ["decode-uri-component"]), []);

    expect(result).toEqual(CLEAN);
  });

  it("reads the threshold on the advisory, not on a mixed entry (catches: threshold read on the entry)", () => {
    const result = compareAudit(
      auditOf("@expo/cli", "moderate", ["zod", advisory("@expo/cli", "GHSA-dddd-eeee-ffff", "low")]),
      [],
    );

    expect(result).toEqual(CLEAN);
  });

  it("reports the unlisted advisory of a package that has a listed one (catches: comparison on the package name)", () => {
    const result = compareAudit(
      auditOf("zod", "high", [
        advisory("zod", "GHSA-aaaa-aaaa-aaaa", "high"),
        advisory("zod", "GHSA-bbbb-bbbb-bbbb", "moderate"),
      ]),
      [listed("GHSA-aaaa-aaaa-aaaa", "zod")],
    );

    expect(result.unlisted.map(({ ghsa }) => ghsa)).toEqual(["GHSA-bbbb-bbbb-bbbb"]);
    expect(result.unused).toEqual([]);
  });

  it("reports a listed GHSA reached through another package (catches: comparison on the GHSA alone)", () => {
    const result = compareAudit(
      audit({
        p: entry("p", "high", [advisory("p", "GHSA-xxxx-xxxx-xxxx", "high")]),
        q: entry("q", "high", [advisory("q", "GHSA-xxxx-xxxx-xxxx", "high")]),
      }),
      [listed("GHSA-xxxx-xxxx-xxxx", "p")],
    );

    expect(result.unlisted.map(({ ghsa, package: name }) => [name, ghsa])).toEqual([["q", "GHSA-xxxx-xxxx-xxxx"]]);
  });

  it("reports a GHSA repeated within one entry once (catches: deduplication removed)", () => {
    const result = compareAudit(
      auditOf("zod", "high", [
        advisory("zod", "GHSA-aaaa-bbbb-cccc", "high", { range: "<3.0.0" }),
        advisory("zod", "GHSA-aaaa-bbbb-cccc", "high", { range: ">=4.0.0 <4.6.6" }),
      ]),
      [],
    );

    expect(result.unlisted.map(({ ghsa }) => ghsa)).toEqual(["GHSA-aaaa-bbbb-cccc"]);
  });

  it("reports an advisory whose url has no GHSA with its source and url (catches: advisory without GHSA skipped)", () => {
    const result = compareAudit(
      auditOf("zod", "high", [advisory("zod", "x", "high", { source: 42, url: "https://example.test/42" })]),
      [],
    );

    expect(result.unlisted).toEqual([
      expect.objectContaining({ ghsa: null, package: "zod", source: 42, url: "https://example.test/42" }),
    ]);
  });

  it("accepts a clean audit (catches: empty report read as unavailable)", () => {
    expect(compareAudit(audit({}), [])).toEqual(CLEAN);
  });

  it.each([
    ["an npm error", { message: "request to https://registry.npmjs.org failed", error: { code: "ENOTFOUND" } }],
    ["another report version", { auditReportVersion: 1, vulnerabilities: {} }],
    ["a null report", { auditReportVersion: 2, vulnerabilities: null }],
    ["no report", null],
  ])("marks %s as unavailable (catches: error output read as no advisory)", (_, output) => {
    expect(compareAudit(output, [listed("GHSA-aaaa-bbbb-cccc", "zod")])).toEqual({ ...CLEAN, unavailable: true });
  });
});

describe("isFixableWithinMajor", () => {
  it.each([
    [true, true],
    [false, false],
    [{ name: "@react-native-community/cli", version: "20.2.0", isSemVerMajor: false }, true],
    [{ name: "expo", version: "51.0.39", isSemVerMajor: true }, false],
  ])("reads fixAvailable %j as %s (catches: semver-major fix offered to npm audit fix)", (fixAvailable, expected) => {
    expect(isFixableWithinMajor(fixAvailable)).toBe(expected);
  });
});
