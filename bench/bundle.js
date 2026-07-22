const fs = require('node:fs');
const path = require('node:path');

const { canonicalStringify, sha256 } = require('./canonical');
const { parseStrictJudgeJson, scoreDeterministicResult } = require('./scorer');
const { assertPrivateArtifactPath } = require('./private-path');
const { TASKS } = require('./runner');
const { MAX_OUTPUT_TOKENS, MAX_RESPONSE_JSON_BYTES } = require('./models');

const FILES = ['manifest.json', 'cases.jsonl', 'summary.json'];
const INTEGRITY_FILE = 'integrity.json';
const MAX_BUNDLE_BYTES = 100 * 1024 * 1024;
const SAFE_RUN_ID = /^[a-z0-9][a-z0-9._-]{2,80}$/;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function planDigest(plan) {
  const copy = clone(plan);
  delete copy.planDigest;
  return sha256(copy).slice(0, 20);
}

function assertPlan(plan) {
  if (!plan || plan.schemaVersion !== '1.0.0') throw new Error('Unsupported or missing benchmark plan schema.');
  if (!Array.isArray(plan.caseExecutions) || !Array.isArray(plan.requestGroups)) {
    throw new Error('Benchmark plan is missing case executions or request groups.');
  }
  if (
    plan.configuration?.maxOutputTokensPerRequest !== MAX_OUTPUT_TOKENS
    || plan.configuration?.maxResponseJsonBytesPerRequest !== MAX_RESPONSE_JSON_BYTES
  ) {
    throw new Error('Benchmark plan output ceilings do not match this runner implementation.');
  }
  const expected = planDigest(plan);
  if (plan.planDigest !== expected) throw new Error(`Benchmark plan digest mismatch; expected ${expected}.`);
}

function assertNoSymlinkComponents(targetPath) {
  const absolute = path.resolve(targetPath);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) continue;
    const stats = fs.lstatSync(current);
    if (stats.isSymbolicLink()) {
      const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
      const userControlled = currentUid === null || stats.uid === currentUid;
      if (userControlled) throw new Error(`Symlink paths are not allowed: ${current}`);
    }
  }
}

function ensurePrivateParent(targetPath) {
  const parent = path.dirname(path.resolve(targetPath));
  const missing = [];
  let cursor = parent;
  while (!fs.existsSync(cursor)) {
    missing.push(cursor);
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
  assertNoSymlinkComponents(cursor);
  for (const directory of missing.reverse()) fs.mkdirSync(directory, { mode: 0o700 });
  assertNoSymlinkComponents(parent);
}

function writeExclusive(filePath, bytes, mode = 0o600) {
  ensurePrivateParent(filePath);
  assertNoSymlinkComponents(path.dirname(filePath));
  const fd = fs.openSync(filePath, 'wx', mode);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(filePath, mode);
}

function atomicReplace(filePath, bytes, mode = 0o600) {
  const directory = path.dirname(filePath);
  assertNoSymlinkComponents(directory);
  const temp = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  writeExclusive(temp, bytes, mode);
  fs.renameSync(temp, filePath);
}

function writePlanFile(filePath, plan) {
  assertPlan(plan);
  const absolute = assertPrivateArtifactPath(filePath, { label: 'Private plan' });
  writeExclusive(absolute, `${JSON.stringify(plan, null, 2)}\n`, 0o600);
}

function readPlanFile(filePath) {
  const absolute = path.resolve(filePath);
  assertNoSymlinkComponents(absolute);
  const stats = fs.lstatSync(absolute);
  if (!stats.isFile() || stats.size > 10 * 1024 * 1024) throw new Error('Plan must be a regular JSON file under 10 MB.');
  const plan = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  assertPlan(plan);
  return plan;
}

function startBundle({ outputDir, plan, mode, startedAt = new Date().toISOString() }) {
  assertPlan(plan);
  const absolute = assertPrivateArtifactPath(outputDir, { label: 'Private bundle' });
  if (absolute !== path.resolve(plan.configuration.bundlePath)) {
    throw new Error('Bundle output must match the path bound into the frozen plan.');
  }
  const runId = path.basename(absolute);
  if (!SAFE_RUN_ID.test(runId)) throw new Error('Bundle directory name must be a lowercase run ID using letters, numbers, dots, dashes, or underscores.');
  ensurePrivateParent(absolute);
  assertNoSymlinkComponents(path.dirname(absolute));
  if (fs.existsSync(absolute)) throw new Error(`Bundle output already exists: ${absolute}`);
  fs.mkdirSync(absolute, { mode: 0o700 });

  const manifest = {
    schemaId: 'clawbotomy.evidence-bundle/v1',
    runId,
    lifecycle: {
      status: 'incomplete',
      startedAt,
      completedAt: null,
    },
    evidence: {
      measurementStatus: mode === 'live' ? 'measured' : 'synthetic-test',
      reproducibilityStatus: 'incomplete',
      reviewStatus: 'maintainer-self-reported',
      authorizationStatus: 'non-authorizing',
    },
    execution: { mode },
    plan,
    actual: {
      scheduledCases: plan.caseExecutions.length,
      records: 0,
      completedCases: 0,
      scoredCases: 0,
      failedCases: 0,
      targetRequests: 0,
      judgeRequests: 0,
    },
    publication: null,
  };

  writeExclusive(path.join(absolute, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeExclusive(path.join(absolute, 'cases.jsonl'), '');
  return { outputDir: absolute, manifest };
}

function appendCaseRecord(outputDir, record) {
  const filePath = path.join(path.resolve(outputDir), 'cases.jsonl');
  assertNoSymlinkComponents(filePath);
  const fd = fs.openSync(filePath, 'a', 0o600);
  try {
    fs.writeSync(fd, `${canonicalStringify(record)}\n`);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function parseCases(bytes) {
  const text = bytes.toString('utf8');
  if (!text) return [];
  if (!text.endsWith('\n')) throw new Error('cases.jsonl is truncated; the final record has no newline.');
  return text.slice(0, -1).split('\n').map((line, index) => {
    if (!line.trim()) throw new Error(`cases.jsonl contains a blank record at line ${index + 1}.`);
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`cases.jsonl contains invalid JSON at line ${index + 1}.`);
    }
  });
}

function recordTuple(record) {
  return `${record.model}\u0000${record.category}\u0000${record.case_id}\u0000${record.run_index}`;
}

function validateRecords(plan, records, { requireComplete = false, allowRedacted = false } = {}) {
  const expectedByOrdinal = new Map(plan.caseExecutions.map((entry, index) => [index + 1, entry]));
  const ordinals = new Set();
  const tuples = new Set();
  const recordIds = new Set();

  if (records.length > plan.caseExecutions.length) throw new Error('Bundle contains more case records than the frozen plan.');

  for (const record of records) {
    if (!record || record.schemaId !== 'clawbotomy.case-record/v1') throw new Error('Case record has an unsupported schema.');
    if (!Number.isInteger(record.plan_ordinal) || !expectedByOrdinal.has(record.plan_ordinal)) {
      throw new Error(`Case record has an unplanned ordinal: ${record.plan_ordinal}`);
    }
    if (ordinals.has(record.plan_ordinal)) throw new Error(`Duplicate plan ordinal: ${record.plan_ordinal}`);
    ordinals.add(record.plan_ordinal);
    if (recordIds.has(record.record_id)) throw new Error(`Duplicate record ID: ${record.record_id}`);
    recordIds.add(record.record_id);
    const tuple = recordTuple(record);
    if (tuples.has(tuple)) throw new Error(`Duplicate case tuple: ${tuple.replaceAll('\u0000', '/')}`);
    tuples.add(tuple);

    const expected = expectedByOrdinal.get(record.plan_ordinal);
    if (
      record.model !== expected.target.alias
      || record.category !== expected.category
      || record.case_id !== expected.caseId
      || record.case_sha256 !== expected.caseSha256
      || record.run_index !== expected.runIndex
      || record.target_model?.provider !== expected.target.provider
      || record.target_model?.requestedModelId !== expected.target.modelId
    ) {
      throw new Error(`Case record ${record.record_id} does not match frozen plan ordinal ${record.plan_ordinal}.`);
    }

    if (!['complete', 'failed', 'unknown_after_send', 'cancelled'].includes(record.status)) {
      throw new Error(`Case record ${record.record_id} has invalid status ${record.status}.`);
    }
    if (!Array.isArray(record.target_requests) || record.target_requests.length > expected.target.requestCount) {
      throw new Error(`Case record ${record.record_id} has an invalid target request graph.`);
    }
    if (record.status === 'complete' && record.target_requests.length !== expected.target.requestCount) {
      throw new Error(`Complete case record ${record.record_id} is missing target request evidence.`);
    }
    for (const request of record.target_requests) {
      if (
        request.provider !== expected.target.provider
        || request.requestedModelId !== expected.target.modelId
        || !Number.isFinite(request.latencyMs)
        || request.latencyMs < 0
        || ![
          'received',
          'provider_error',
          'unknown_after_send',
          'response_too_large',
          'invalid_response',
        ].includes(request.outcome)
      ) {
        throw new Error(`Case record ${record.record_id} contains invalid target telemetry.`);
      }
    }
    if (record.status === 'complete' && record.target_requests.some((request) => request.outcome !== 'received')) {
      throw new Error(`Complete case record ${record.record_id} contains a failed target request.`);
    }
    if (
      record.status === 'complete'
      && record.target_requests.at(-1)?.rawResponse !== record.response
    ) {
      throw new Error(`Case record ${record.record_id} response does not match its final target trace.`);
    }
    if (record.evaluation_status === 'scored') {
      if (!Number.isFinite(record.raw_score) || record.raw_score < 0 || record.raw_score > 10) {
        throw new Error(`Scored case record ${record.record_id} has an invalid score.`);
      }
    } else if (record.raw_score !== null) {
      throw new Error(`Unscored case record ${record.record_id} must use a null score.`);
    }
    if (record.status === 'complete' && expected.scoring.mode === 'deterministic-rubric') {
      if (record.judge_model !== 'deterministic-rubric' || record.judge_trace !== null) {
        throw new Error(`Deterministic case record ${record.record_id} contains unexpected judge evidence.`);
      }
      const task = TASKS[expected.category];
      const testCase = task?.loadCases().find((candidate) => candidate.id === expected.caseId);
      if (!testCase || sha256(testCase) !== expected.caseSha256) {
        throw new Error(`Deterministic case source drift for ${record.record_id}.`);
      }
      if (!allowRedacted) {
        const recomputedScore = scoreDeterministicResult({
          category: expected.category,
          testCase,
          responseText: record.response,
          referenceTime: record.started_at,
        });
        if (
          !recomputedScore
          || recomputedScore.raw_score !== record.raw_score
          || recomputedScore.justification !== record.justification
        ) {
          throw new Error(`Deterministic score mismatch in ${record.record_id}.`);
        }
      }
    }
    if (expected.scoring.mode === 'model-judge' && record.judge_trace) {
      if (
        record.judge_trace.provider !== expected.scoring.judgeProvider
        || record.judge_trace.requestedModelId !== expected.scoring.judgeModelId
        || !Number.isFinite(record.judge_trace.latencyMs)
        || record.judge_trace.latencyMs < 0
      ) {
        throw new Error(`Model-judged case record ${record.record_id} contains an unplanned judge trace.`);
      }
    }
    if (record.status === 'complete' && expected.scoring.mode === 'model-judge') {
      const trace = record.judge_trace;
      if (
        !trace
        || trace.provider !== expected.scoring.judgeProvider
        || trace.requestedModelId !== expected.scoring.judgeModelId
      ) {
        throw new Error(`Model-judged case record ${record.record_id} is missing the planned judge identity.`);
      }
      const parsedJudge = parseStrictJudgeJson(trace.rawResponse);
      if (record.evaluation_status === 'scored') {
        if (!allowRedacted) {
          if (
            !parsedJudge
            || parsedJudge.score !== record.raw_score
            || parsedJudge.justification !== record.justification
            || trace.outputValid !== true
          ) {
            throw new Error(`Model-judged case record ${record.record_id} does not match its strict judge output.`);
          }
        }
      } else if (parsedJudge || trace.outputValid !== false) {
        throw new Error(`Failed judge evidence in ${record.record_id} contains a valid unrecorded score.`);
      }
    }
    for (const request of record.target_requests) {
      if (request.modelIdentityStatus === 'mismatch') {
        throw new Error(`Provider model identity mismatch in ${record.record_id}.`);
      }
    }
    if (record.judge_trace?.modelIdentityStatus === 'mismatch') {
      throw new Error(`Judge model identity mismatch in ${record.record_id}.`);
    }
  }

  if (requireComplete && records.length !== plan.caseExecutions.length) {
    throw new Error(`Complete bundle requires ${plan.caseExecutions.length} records; found ${records.length}.`);
  }
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function deriveSummary(plan, records, { executionMode = 'live', reproducibilityStatus = 'complete' } = {}) {
  validateRecords(plan, records, { allowRedacted: reproducibilityStatus === 'redacted' });
  const byOrdinal = new Map(records.map((record) => [record.plan_ordinal, record]));
  const groups = new Map();

  plan.caseExecutions.forEach((entry, index) => {
    const key = `${entry.category}\u0000${entry.target.alias}`;
    const group = groups.get(key) || {
      category: entry.category,
      model: {
        alias: entry.target.alias,
        provider: entry.target.provider,
        requestedModelId: entry.target.modelId,
      },
      plannedOrdinals: [],
    };
    group.plannedOrdinals.push(index + 1);
    groups.set(key, group);
  });

  const aggregates = [...groups.values()]
    .sort((a, b) => `${a.category}:${a.model.alias}`.localeCompare(`${b.category}:${b.model.alias}`))
    .map((group) => {
      const groupRecords = group.plannedOrdinals.map((ordinal) => byOrdinal.get(ordinal)).filter(Boolean);
      const completed = groupRecords.filter((record) => record.status === 'complete');
      const scored = completed.filter((record) => record.evaluation_status === 'scored');
      const scores = scored.map((record) => record.raw_score);
      const reportedModelIds = [...new Set(
        completed.flatMap((record) => record.target_requests.map((request) => request.reportedModelId).filter(Boolean)),
      )].sort();
      const eligibilityReasons = [];
      if (executionMode !== 'live') eligibilityReasons.push('synthetic execution');
      if (plan.configuration.runs < 5) eligibilityReasons.push('fewer than 5 runs');
      if (reproducibilityStatus !== 'complete') eligibilityReasons.push(`reproducibility ${reproducibilityStatus}`);
      if (completed.length !== group.plannedOrdinals.length) eligibilityReasons.push('incomplete case coverage');
      if (scored.length !== group.plannedOrdinals.length) eligibilityReasons.push('incomplete score coverage');
      const identityComplete = completed.every((record) => (
        record.target_requests.every((request) => (
          Boolean(request.reportedModelId)
          && ['exact-match', 'compatible-snapshot'].includes(request.modelIdentityStatus)
        ))
        && (!record.judge_trace || (
          Boolean(record.judge_trace.reportedModelId)
          && ['exact-match', 'compatible-snapshot'].includes(record.judge_trace.modelIdentityStatus)
        ))
      ));
      if (!identityComplete) eligibilityReasons.push('provider identity incomplete');

      return {
        aggregateId: `aggregate-${sha256({ category: group.category, model: group.model }).slice(0, 20)}`,
        category: group.category,
        model: { ...group.model, reportedModelIds },
        scheduled: group.plannedOrdinals.length,
        completed: completed.length,
        scored: scored.length,
        failed: group.plannedOrdinals.length - scored.length,
        meanScore: scores.length ? Number(average(scores).toFixed(4)) : null,
        minScore: scores.length ? Math.min(...scores) : null,
        maxScore: scores.length ? Math.max(...scores) : null,
        eligible: eligibilityReasons.length === 0,
        eligibilityReasons,
        caseRecordIds: groupRecords.map((record) => record.record_id).sort(),
      };
    });

  return {
    schemaId: 'clawbotomy.summary/v1',
    totals: {
      scheduled: plan.caseExecutions.length,
      records: records.length,
      completed: records.filter((record) => record.status === 'complete').length,
      scored: records.filter((record) => record.status === 'complete' && record.evaluation_status === 'scored').length,
      failed: plan.caseExecutions.length - records.filter(
        (record) => record.status === 'complete' && record.evaluation_status === 'scored',
      ).length,
    },
    aggregates,
    leaders: [],
    authorizationStatus: 'non-authorizing',
  };
}

function requestCount(records, field) {
  return records.reduce((sum, record) => sum + (Array.isArray(record[field]) ? record[field].length : 0), 0);
}

function finishBundle({ outputDir, terminalStatus = null, completedAt = new Date().toISOString() }) {
  const absolute = path.resolve(outputDir);
  const manifestPath = path.join(absolute, 'manifest.json');
  const casesPath = path.join(absolute, 'cases.jsonl');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assertPlan(manifest.plan);
  const records = parseCases(fs.readFileSync(casesPath));
  validateRecords(manifest.plan, records);

  const completedCases = records.filter((record) => record.status === 'complete').length;
  const scoredCases = records.filter(
    (record) => record.status === 'complete' && record.evaluation_status === 'scored',
  ).length;
  const fullyComplete = records.length === manifest.plan.caseExecutions.length
    && completedCases === records.length
    && scoredCases === records.length;
  const status = terminalStatus || (fullyComplete ? 'complete' : 'incomplete');
  const reproducibilityStatus = status === 'complete' ? 'complete' : 'incomplete';
  const summary = deriveSummary(manifest.plan, records, {
    executionMode: manifest.execution.mode,
    reproducibilityStatus,
  });

  manifest.lifecycle = { ...manifest.lifecycle, status, completedAt };
  manifest.evidence.reproducibilityStatus = reproducibilityStatus;
  manifest.actual = {
    scheduledCases: manifest.plan.caseExecutions.length,
    records: records.length,
    completedCases,
    scoredCases,
    failedCases: manifest.plan.caseExecutions.length - scoredCases,
    targetRequests: requestCount(records, 'target_requests'),
    judgeRequests: records.filter((record) => record.judge_trace).length,
  };

  atomicReplace(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  atomicReplace(path.join(absolute, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  const files = Object.fromEntries(FILES.map((name) => {
    const bytes = fs.readFileSync(path.join(absolute, name));
    return [name, { sha256: sha256(bytes), bytes: bytes.length }];
  }));
  const integrity = {
    schemaId: 'clawbotomy.integrity/v1',
    algorithm: 'sha256',
    files,
    bundleDigest: sha256(files),
  };
  writeExclusive(path.join(absolute, INTEGRITY_FILE), `${JSON.stringify(integrity, null, 2)}\n`);
  return { manifest, records, summary, integrity };
}

function materializeBundle({ outputDir, manifest, records, summary, directoryMode = 0o700, fileMode = 0o600 }) {
  const absolute = path.resolve(outputDir);
  const runId = path.basename(absolute);
  if (!SAFE_RUN_ID.test(runId)) throw new Error('Bundle directory name is not a safe run ID.');
  ensurePrivateParent(absolute);
  assertNoSymlinkComponents(path.dirname(absolute));
  if (fs.existsSync(absolute)) throw new Error(`Bundle output already exists: ${absolute}`);
  fs.mkdirSync(absolute, { mode: directoryMode });
  fs.chmodSync(absolute, directoryMode);

  const contents = {
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'cases.jsonl': records.map((record) => canonicalStringify(record)).join('\n') + (records.length ? '\n' : ''),
    'summary.json': `${JSON.stringify(summary, null, 2)}\n`,
  };
  const files = {};
  for (const name of FILES) {
    const bytes = Buffer.from(contents[name], 'utf8');
    writeExclusive(path.join(absolute, name), bytes, fileMode);
    files[name] = { sha256: sha256(bytes), bytes: bytes.length };
  }
  const integrity = {
    schemaId: 'clawbotomy.integrity/v1',
    algorithm: 'sha256',
    files,
    bundleDigest: sha256(files),
  };
  writeExclusive(path.join(absolute, INTEGRITY_FILE), `${JSON.stringify(integrity, null, 2)}\n`, fileMode);
  return { outputDir: absolute, manifest, records, summary, integrity };
}

function readBytesChecked(bundleDir, name) {
  const filePath = path.join(bundleDir, name);
  assertNoSymlinkComponents(filePath);
  const stats = fs.lstatSync(filePath);
  if (!stats.isFile()) throw new Error(`${name} must be a regular file.`);
  if (stats.size > MAX_BUNDLE_BYTES) throw new Error(`${name} exceeds the bundle size limit.`);
  return fs.readFileSync(filePath);
}

function readBundle(outputDir, { requireComplete = false } = {}) {
  const absolute = path.resolve(outputDir);
  assertNoSymlinkComponents(absolute);
  const directoryStats = fs.lstatSync(absolute);
  if (!directoryStats.isDirectory()) throw new Error('Evidence bundle must be a directory.');
  const expectedNames = [...FILES, INTEGRITY_FILE].sort();
  const entries = fs.readdirSync(absolute, { withFileTypes: true });
  const actualNames = entries.map((entry) => entry.name).sort();
  if (
    entries.some((entry) => !entry.isFile())
    || canonicalStringify(actualNames) !== canonicalStringify(expectedNames)
  ) {
    throw new Error(`Evidence bundle contains unexpected or missing files: ${actualNames.join(', ')}.`);
  }

  const integrityBytes = readBytesChecked(absolute, INTEGRITY_FILE);
  const integrity = JSON.parse(integrityBytes.toString('utf8'));
  if (integrity.schemaId !== 'clawbotomy.integrity/v1' || integrity.algorithm !== 'sha256') {
    throw new Error('Unsupported integrity manifest.');
  }

  const byteMap = {};
  let totalBytes = integrityBytes.length;
  for (const name of FILES) {
    const bytes = readBytesChecked(absolute, name);
    totalBytes += bytes.length;
    if (totalBytes > MAX_BUNDLE_BYTES) throw new Error('Evidence bundle exceeds the total size limit.');
    byteMap[name] = bytes;
    const expected = integrity.files?.[name];
    if (!expected || expected.bytes !== bytes.length || expected.sha256 !== sha256(bytes)) {
      throw new Error(`Integrity mismatch for ${name}.`);
    }
  }
  if (integrity.bundleDigest !== sha256(integrity.files)) throw new Error('Bundle digest mismatch.');

  const manifest = JSON.parse(byteMap['manifest.json'].toString('utf8'));
  const records = parseCases(byteMap['cases.jsonl']);
  const summary = JSON.parse(byteMap['summary.json'].toString('utf8'));
  if (manifest.schemaId !== 'clawbotomy.evidence-bundle/v1') throw new Error('Unsupported bundle manifest schema.');
  assertPlan(manifest.plan);
  const complete = manifest.lifecycle?.status === 'complete';
  if (requireComplete && !complete) throw new Error(`Bundle is not complete (${manifest.lifecycle?.status || 'unknown'}).`);
  validateRecords(manifest.plan, records, {
    requireComplete: complete,
    allowRedacted: manifest.evidence?.reproducibilityStatus === 'redacted',
  });
  const recomputed = deriveSummary(manifest.plan, records, {
    executionMode: manifest.execution?.mode,
    reproducibilityStatus: manifest.evidence?.reproducibilityStatus,
  });
  if (canonicalStringify(summary) !== canonicalStringify(recomputed)) {
    throw new Error('Stored summary does not match deterministic recomputation.');
  }
  if (
    manifest.actual?.scheduledCases !== summary.totals.scheduled
    || manifest.actual?.records !== summary.totals.records
    || manifest.actual?.completedCases !== summary.totals.completed
    || manifest.actual?.scoredCases !== summary.totals.scored
    || manifest.actual?.failedCases !== summary.totals.failed
  ) {
    throw new Error('Manifest actual counts do not match records and summary.');
  }

  return { outputDir: absolute, manifest, records, summary, integrity };
}

module.exports = {
  FILES,
  INTEGRITY_FILE,
  SAFE_RUN_ID,
  appendCaseRecord,
  assertPlan,
  deriveSummary,
  finishBundle,
  materializeBundle,
  planDigest,
  readBundle,
  readPlanFile,
  startBundle,
  validateRecords,
  writePlanFile,
};
