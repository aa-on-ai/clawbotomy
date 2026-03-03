const instructionFollowing = require('./tasks/instruction-following');
const toolUse = require('./tasks/tool-use');
const codeGeneration = require('./tasks/code-generation');
const { getModel, callModel } = require('./models');
const { scoreResult } = require('./scorer');

const TASKS = {
  'instruction-following': instructionFollowing,
  'tool-use': toolUse,
  'code-generation': codeGeneration,
};

function expandTaskAliases(taskArg) {
  if (taskArg === 'all') return Object.keys(TASKS);
  return taskArg.split(',').map((x) => x.trim()).filter(Boolean);
}

function pLimit(concurrency) {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    if (activeCount >= concurrency || queue.length === 0) return;
    const { fn, resolve, reject } = queue.shift();
    activeCount += 1;

    Promise.resolve()
      .then(fn)
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeCount -= 1;
        next();
      });
  };

  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

async function runBenchmark({ models, tasks, runs = 1, judge = 'sonnet', dryRun = false, localEndpoint }) {
  const selectedTasks = expandTaskAliases(tasks);
  const allResults = [];
  const limit = pLimit(3);

  for (const modelAlias of models) {
    const model = getModel(modelAlias, { localEndpoint });

    for (const taskName of selectedTasks) {
      const task = TASKS[taskName];
      if (!task) throw new Error(`Unknown task category: ${taskName}`);

      const cases = task.loadCases();
      for (let r = 0; r < runs; r += 1) {
        const caseResults = await Promise.all(
          cases.map((testCase) =>
            limit(async () => {
              const prompt = task.buildPrompt(testCase);
              const response = await callModel({
                model,
                systemPrompt: prompt.systemPrompt,
                userPrompt: prompt.userPrompt,
                dryRun,
              });

              const base = {
                model: modelAlias,
                category: taskName,
                case_id: testCase.id,
                prompt: prompt.userPrompt,
                response,
                raw_score: null,
                justification: '',
                run_index: r + 1,
              };

              return scoreResult({ result: base, testCase, defaultJudge: judge, dryRun, localEndpoint });
            })
          )
        );

        allResults.push(...caseResults);
      }
    }
  }

  return allResults;
}

module.exports = {
  runBenchmark,
  TASKS,
};
