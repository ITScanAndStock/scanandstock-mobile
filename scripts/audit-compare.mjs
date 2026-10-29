const SEVERITIES = ["info", "low", "moderate", "high", "critical"];
const THRESHOLD = SEVERITIES.indexOf("moderate");

// An advisory without a GHSA is keyed by its npm source id, so no exception can ever cover it.
const advisoryId = (name, ghsa, source) => (ghsa === null ? `${name} source ${source}` : `${name} ${ghsa}`);

const isAuditReportV2 = (audit) =>
  audit?.auditReportVersion === 2 && typeof audit.vulnerabilities === "object" && audit.vulnerabilities !== null;

const isBelowThreshold = (severity) => {
  const rank = SEVERITIES.indexOf(severity);
  return rank !== -1 && rank < THRESHOLD;
};

export const isFixableWithinMajor = (fixAvailable) => fixAvailable === true || fixAvailable?.isSemVerMajor === false;

export function compareAudit(audit, exceptions) {
  if (!isAuditReportV2(audit)) {
    return { unavailable: true, unlisted: [], unused: [] };
  }
  const listed = new Set(exceptions.map((exception) => advisoryId(exception.package, exception.ghsa)));
  const reported = new Set();
  const unlisted = [];
  for (const entry of Object.values(audit.vulnerabilities)) {
    for (const via of entry.via) {
      if (typeof via === "string" || isBelowThreshold(via.severity)) {
        continue;
      }
      const ghsa = via.url?.match(/GHSA(-[0-9a-z]{4}){3}/)?.[0] ?? null;
      const id = advisoryId(via.name, ghsa, via.source);
      if (reported.has(id)) {
        continue;
      }
      reported.add(id);
      if (listed.has(id)) {
        continue;
      }
      unlisted.push({
        ghsa,
        package: via.name,
        severity: via.severity,
        title: via.title,
        url: via.url,
        source: via.source,
        fixAvailable: entry.fixAvailable,
      });
    }
  }
  const unused = exceptions
    .filter((exception) => !reported.has(advisoryId(exception.package, exception.ghsa)))
    .map(({ ghsa, package: name }) => ({ ghsa, package: name }));
  return { unavailable: false, unlisted, unused };
}
