const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  authorizeLivePlan,
  buildRunPlan,
  conservativeTokenUpperBound,
  formatPreflight,
  judgeInputTokensUpper,
  MODEL_JUDGED_TASKS,
  worstCaseJudgeMessages,
} = require('../bench/preflight');
const { MAX_RESPONSE_JSON_BYTES } = require('../bench/models');
const { TASKS } = require('../bench/runner');

const source = {
  repository: 'https://github.com/aa-on-ai/clawbotomy',
  commitSha: 'a'.repeat(40),
  dirty: false,
};

function plan(overrides = {}) {
  return buildRunPlan({
    models: ['sonnet'],
    tasks: ['instruction-following'],
    runs: 1,
    judge: 'opus',
    localEndpoint: 'http://localhost:1234/v1',
    bundlePath: '.clawbotomy/runs/test.json',
    source,
    ...overrides,
  });
}

test('preflight plans the real turn graph and makes no provider request', () => {
  const originalFetch = global.fetch;
  global.fetch = () => {
    throw new Error('preflight must not call a provider');
  };

  try {
    const allTasks = plan({
      tasks: [
        'instruction-following',
        'tool-use',
        'code-generation',
        'summarization',
        'judgment',
        'multi-turn',
        'safety-trust',
      ],
    });

    assert.equal(allTasks.totals.cases, 33);
    assert.equal(allTasks.totals.targetRequests, 60);
    assert.equal(allTasks.totals.judgeRequests, 18);
    assert.equal(allTasks.totals.providerRequests, 78);
    assert.equal(allTasks.totals.unpricedModels.length, 0);
    assert.ok(allTasks.totals.costUpperUsd > allTasks.totals.costLowerUsd);
    assert.equal(allTasks.configuration.maxResponseJsonBytesPerRequest, MAX_RESPONSE_JSON_BYTES);
  } finally {
    global.fetch = originalFetch;
  }
});

test('judge input ceilings use the exact shared envelope at maximum response size', () => {
  for (const category of MODEL_JUDGED_TASKS) {
    const task = TASKS[category];
    for (const testCase of task.loadCases()) {
      const messages = worstCaseJudgeMessages(task, testCase);
      const messageBytes = messages.reduce(
        (sum, message) => sum + Buffer.byteLength(message.role, 'utf8') + Buffer.byteLength(message.content, 'utf8'),
        0,
      );
      const upper = judgeInputTokensUpper(task, testCase);
      assert.ok(upper > messageBytes, `${category}/${testCase.id}`);
    }
  }
  const safetyTask = TASKS['safety-trust'];
  const safetyUpper = judgeInputTokensUpper(safetyTask, safetyTask.loadCases()[0]);
  assert.ok(safetyUpper > MAX_RESPONSE_JSON_BYTES * 3, 'safety envelope must include all three target outputs');
});

test('preflight rejects duplicate selections before they can duplicate spend', () => {
  assert.throws(() => plan({ models: ['sonnet', 'sonnet'] }), /Duplicate model selection: sonnet/);
  assert.throws(
    () => plan({ tasks: ['instruction-following', 'instruction-following'] }),
    /Duplicate task selection: instruction-following/,
  );
});

test('preflight uses a true byte-level token ceiling and rejects public worktree output', () => {
  const sample = 'é🙂 adversarial-tokenization';
  assert.ok(conservativeTokenUpperBound(sample) > Buffer.byteLength(sample, 'utf8'));
  assert.throws(
    () => plan({ bundlePath: path.join(process.cwd(), 'public/evidence/run-private') }),
    /outside the repository or under .*\.clawbotomy/,
  );
});

test('the plan digest binds source, scope, and private output path', () => {
  const baseline = plan();
  const changedTask = plan({ tasks: ['tool-use'] });
  const changedOutput = plan({ bundlePath: '.clawbotomy/runs/other.json' });
  const dirtySource = plan({ source: { ...source, dirty: true } });

  assert.match(baseline.planDigest, /^[a-f0-9]{20}$/);
  assert.notEqual(baseline.planDigest, changedTask.planDigest);
  assert.notEqual(baseline.planDigest, changedOutput.planDigest);
  assert.notEqual(baseline.planDigest, dirtySource.planDigest);
  assert.equal(baseline.configuration.bundlePath, path.resolve('.clawbotomy/runs/test.json'));
});

test('live authorization requires the reviewed digest and a sufficient cost cap', () => {
  const reviewed = plan();

  assert.throws(
    () => authorizeLivePlan(reviewed, {
      maxCostUsd: reviewed.totals.costUpperUsd,
      maxRequests: reviewed.totals.providerRequests,
    }),
    /require --confirm-plan/,
  );
  assert.throws(
    () => authorizeLivePlan(reviewed, {
      confirmPlan: '0'.repeat(20),
      maxCostUsd: reviewed.totals.costUpperUsd,
      maxRequests: reviewed.totals.providerRequests,
    }),
    /confirmation mismatch/,
  );
  assert.throws(
    () => authorizeLivePlan(reviewed, {
      confirmPlan: reviewed.planDigest,
      maxCostUsd: Math.max(0, reviewed.totals.costUpperUsd - 0.000001),
      maxRequests: reviewed.totals.providerRequests,
    }),
    /below the conservative plan bound/,
  );

  assert.doesNotThrow(() => authorizeLivePlan(reviewed, {
    confirmPlan: reviewed.planDigest,
    maxCostUsd: reviewed.totals.costUpperUsd,
    maxRequests: reviewed.totals.providerRequests,
  }));

  assert.throws(() => authorizeLivePlan(reviewed, {
    confirmPlan: reviewed.planDigest,
    maxCostUsd: reviewed.totals.costUpperUsd,
    maxRequests: reviewed.totals.providerRequests - 1,
  }), /below the planned/);
});

test('human preflight output exposes the evidence and confirmation boundary', () => {
  const reviewed = plan();
  const output = formatPreflight(reviewed);

  assert.match(output, /NO PROVIDER REQUESTS MADE/);
  assert.match(output, new RegExp(reviewed.planDigest));
  assert.match(output, /5 target \+ 0 judge/);
  assert.match(output, /Estimated provider cost:/);
  assert.match(output, /--confirm-plan/);
  assert.match(output, /Private bundle:/);
});
