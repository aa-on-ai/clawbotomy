function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function bar(score) {
  const filled = Math.round(score);
  return `${'▓'.repeat(filled)}${'░'.repeat(10 - filled)}`;
}

function summarize(results) {
  const byModel = {};
  const byCategory = {};
  const coverage = { records: results.length, completed: 0, scored: 0, failed: 0 };

  for (const row of results) {
    if (row.status === 'complete') coverage.completed += 1;
    if (!Number.isFinite(row.raw_score)) {
      coverage.failed += 1;
      continue;
    }
    coverage.scored += 1;
    byModel[row.model] = byModel[row.model] || {};
    byModel[row.model][row.category] = byModel[row.model][row.category] || [];
    byModel[row.model][row.category].push(row.raw_score);

    byCategory[row.category] = byCategory[row.category] || {};
    byCategory[row.category][row.model] = byCategory[row.category][row.model] || [];
    byCategory[row.category][row.model].push(row.raw_score);
  }

  return { byModel, byCategory, coverage };
}

const EVIDENCE_LANE = 'model-benchmark';
const CLAIM_BOUNDARY = 'Task-specific recorded scores; not routing, access, safety, or configured-agent evidence.';

function observationTable(summary) {
  const lines = [];
  lines.push('Task Category        Model                    Observed Mean');
  lines.push('─────────────────────────────────────────────────────────');

  for (const [category, modelScores] of Object.entries(summary.byCategory)) {
    for (const [model, scores] of Object.entries(modelScores)) {
      lines.push(`${category.padEnd(20)} ${model.padEnd(24)} ${average(scores).toFixed(2).padStart(5)}`);
    }
  }

  return lines.join('\n');
}

function scorecards(summary) {
  const blocks = [];

  for (const [model, categories] of Object.entries(summary.byModel)) {
    blocks.push(`\nMODEL: ${model}`);
    blocks.push('──────────────────────────────────────────────────────────────────────');

    const entries = Object.entries(categories).map(([category, scores]) => ({ category, score: average(scores) }));

    entries.forEach((e) => {
      blocks.push(`${e.category.padEnd(20)} ${e.score.toFixed(2).padStart(5)}   ${bar(e.score)}`);
    });

  }

  return blocks.join('\n');
}

function deltaReport(summary) {
  const models = Object.keys(summary.byModel);
  if (models.length < 2) return 'Delta report requires at least 2 models.';

  const [a, b] = models;
  const categories = new Set([...Object.keys(summary.byModel[a] || {}), ...Object.keys(summary.byModel[b] || {})]);

  const lines = [];
  lines.push(`\n${a} vs ${b}`);
  lines.push('──────────────────────────────────────────────────────────────────────');
  lines.push('Category             A       B       higher observed mean   delta');

  for (const category of categories) {
    const aScore = average(summary.byModel[a]?.[category] || []);
    const bScore = average(summary.byModel[b]?.[category] || []);
    const higherObservedMean = aScore === bScore ? 'tie' : aScore > bScore ? a : b;
    const delta = Math.abs(aScore - bScore).toFixed(2);
    lines.push(`${category.padEnd(20)} ${aScore.toFixed(2).padEnd(7)} ${bScore.toFixed(2).padEnd(7)} ${higherObservedMean.padEnd(22)} ${delta}`);
  }

  return lines.join('\n');
}

function toJson(summary, rawResults, meta) {
  return JSON.stringify({ evidenceLane: EVIDENCE_LANE, claimBoundary: CLAIM_BOUNDARY, meta, summary, rawResults }, null, 2);
}

function toMarkdown(summary, meta) {
  const lines = [];
  lines.push(`# CLAWBOTOMY MODEL BENCHMARK OBSERVATIONS — ${meta.date}`);
  lines.push(`- ${CLAIM_BOUNDARY}`);
  lines.push(`- Models: ${meta.models.join(', ')}`);
  lines.push(`- Tasks: ${meta.tasks.join(', ')}`);
  if (meta.lowConfidenceWarning) lines.push(`- ⚠️ ${meta.lowConfidenceWarning}`);
  lines.push('');
  lines.push('```');
  lines.push(observationTable(summary));
  lines.push('```');
  return lines.join('\n');
}

function formatReport({ results, output = 'table', meta }) {
  const summary = summarize(results);

  if (output === 'json') return toJson(summary, results, meta);
  if (output === 'markdown') return toMarkdown(summary, meta);

  const parts = [];
  parts.push(`CLAWBOTOMY MODEL BENCHMARK OBSERVATIONS — ${meta.date}`);
  parts.push(CLAIM_BOUNDARY);
  parts.push(`Models tested: ${meta.models.join(', ')}`);
  parts.push(`Coverage: ${summary.coverage.scored}/${summary.coverage.records} scored`);
  if (meta.lowConfidenceWarning) parts.push(`⚠️ ${meta.lowConfidenceWarning}`);
  parts.push('');
  parts.push(observationTable(summary));
  parts.push(scorecards(summary));
  parts.push(deltaReport(summary));

  return parts.join('\n');
}

module.exports = {
  formatReport,
  summarize,
};
