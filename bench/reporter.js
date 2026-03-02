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

  for (const row of results) {
    byModel[row.model] = byModel[row.model] || {};
    byModel[row.model][row.category] = byModel[row.model][row.category] || [];
    byModel[row.model][row.category].push(row.raw_score);

    byCategory[row.category] = byCategory[row.category] || {};
    byCategory[row.category][row.model] = byCategory[row.category][row.model] || [];
    byCategory[row.category][row.model].push(row.raw_score);
  }

  return { byModel, byCategory };
}

function routingTable(summary) {
  const lines = [];
  lines.push('Task Category        Best Model        Fallback           Best Score');
  lines.push('──────────────────────────────────────────────────────────────────────');

  for (const [category, modelScores] of Object.entries(summary.byCategory)) {
    const ranked = Object.entries(modelScores)
      .map(([model, scores]) => ({ model, score: average(scores) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0] || { model: '-', score: 0 };
    const fallback = ranked[1] || { model: '-' };

    lines.push(
      `${category.padEnd(20)} ${best.model.padEnd(16)} ${fallback.model.padEnd(18)} ${best.score
        .toFixed(2)
        .padStart(5)}`
    );
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

    const strengths = [...entries].sort((a, b) => b.score - a.score).slice(0, 2).map((e) => e.category);
    const weaknesses = [...entries].sort((a, b) => a.score - b.score).slice(0, 2).map((e) => e.category);
    blocks.push(`STRENGTHS:   ${strengths.join(', ')}`);
    blocks.push(`WEAKNESSES:  ${weaknesses.join(', ')}`);
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
  lines.push('Category             A       B       winner   delta');

  for (const category of categories) {
    const aScore = average(summary.byModel[a]?.[category] || []);
    const bScore = average(summary.byModel[b]?.[category] || []);
    const winner = aScore === bScore ? 'tie' : aScore > bScore ? a : b;
    const delta = Math.abs(aScore - bScore).toFixed(2);
    lines.push(`${category.padEnd(20)} ${aScore.toFixed(2).padEnd(7)} ${bScore.toFixed(2).padEnd(7)} ${winner.padEnd(8)} ${delta}`);
  }

  return lines.join('\n');
}

function toJson(summary, rawResults, meta) {
  return JSON.stringify({ meta, summary, rawResults }, null, 2);
}

function toMarkdown(summary, meta) {
  const lines = [];
  lines.push(`# CLAWBOTOMY ROUTING BENCHMARK — ${meta.date}`);
  lines.push(`- Models: ${meta.models.join(', ')}`);
  lines.push(`- Tasks: ${meta.tasks.join(', ')}`);
  if (meta.lowConfidenceWarning) lines.push(`- ⚠️ ${meta.lowConfidenceWarning}`);
  lines.push('');
  lines.push('```');
  lines.push(routingTable(summary));
  lines.push('```');
  return lines.join('\n');
}

function formatReport({ results, output = 'table', meta }) {
  const summary = summarize(results);

  if (output === 'json') return toJson(summary, results, meta);
  if (output === 'markdown') return toMarkdown(summary, meta);

  const parts = [];
  parts.push(`CLAWBOTOMY ROUTING BENCHMARK — ${meta.date}`);
  parts.push(`Models tested: ${meta.models.join(', ')}`);
  if (meta.lowConfidenceWarning) parts.push(`⚠️ ${meta.lowConfidenceWarning}`);
  parts.push('');
  parts.push(routingTable(summary));
  parts.push(scorecards(summary));
  parts.push(deltaReport(summary));

  return parts.join('\n');
}

module.exports = {
  formatReport,
  summarize,
};
