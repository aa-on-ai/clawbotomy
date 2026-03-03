const instructionFollowing = require('./tasks/instruction-following');
const toolUse = require('./tasks/tool-use');
const codeGeneration = require('./tasks/code-generation');
const summarization = require('./tasks/summarization');
const judgment = require('./tasks/judgment');
const multiTurn = require('./tasks/multi-turn');
const safetyTrust = require('./tasks/safety-trust');
const { getModel, callModel } = require('./models');
const { scoreResult } = require('./scorer');

const TASKS = {
  'instruction-following': instructionFollowing,
  'tool-use': toolUse,
  'code-generation': codeGeneration,
  summarization,
  judgment,
  'multi-turn': multiTurn,
  'safety-trust': safetyTrust,
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

async function runSingleTurnCase({ model, task, testCase, dryRun }) {
  const prompt = task.buildPrompt(testCase);
  const response = await callModel({
    model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    messages: prompt.messages,
    dryRun,
  });

  return {
    prompt: prompt.messages ? JSON.stringify(prompt.messages, null, 2) : prompt.userPrompt,
    response,
    interaction: null,
  };
}

async function runMultiTurnCase({ model, task, testCase, dryRun }) {
  const prompt = task.buildPrompt(testCase);
  const turns = Array.isArray(prompt.messages) ? prompt.messages : [];
  const convo = [];

  for (const turn of turns) {
    convo.push({ role: turn.role, content: turn.content });
    if (turn.role === 'user') {
      const assistant = await callModel({
        model,
        systemPrompt: prompt.systemPrompt,
        messages: convo,
        dryRun,
      });
      convo.push({ role: 'assistant', content: assistant });
    }
  }

  const finalResponse = [...convo].reverse().find((m) => m.role === 'assistant')?.content || '';
  return {
    prompt: JSON.stringify(turns, null, 2),
    response: finalResponse,
    interaction: convo,
  };
}

async function runSafetyTrustCase({ model, task, testCase, dryRun }) {
  const prompt = task.buildPrompt(testCase);
  const messages = [];

  const baselineInput = prompt.baselinePrompt || 'Complete a neutral, factual baseline task in two concise sentences.';
  messages.push({ role: 'user', content: baselineInput });
  const baselineResponse = await callModel({ model, systemPrompt: prompt.systemPrompt, messages, dryRun });
  messages.push({ role: 'assistant', content: baselineResponse });

  messages.push({ role: 'user', content: prompt.provokePrompt });
  const provokeResponse = await callModel({ model, systemPrompt: prompt.systemPrompt, messages, dryRun });
  messages.push({ role: 'assistant', content: provokeResponse });

  messages.push({ role: 'user', content: prompt.escalationPrompt });
  const escalationResponse = await callModel({ model, systemPrompt: prompt.systemPrompt, messages, dryRun });
  messages.push({ role: 'assistant', content: escalationResponse });

  return {
    prompt: `${baselineInput}\n\n${prompt.provokePrompt}\n\n${prompt.escalationPrompt}`,
    response: escalationResponse,
    interaction: {
      baseline_prompt: baselineInput,
      baseline_response: baselineResponse,
      provoke_prompt: prompt.provokePrompt,
      provoke_response: provokeResponse,
      escalation_prompt: prompt.escalationPrompt,
      escalation_response: escalationResponse,
      transcript: messages,
    },
  };
}

async function executeCase({ model, task, testCase, dryRun }) {
  if (task.category === 'multi-turn') return runMultiTurnCase({ model, task, testCase, dryRun });
  if (task.category === 'safety-trust') return runSafetyTrustCase({ model, task, testCase, dryRun });
  return runSingleTurnCase({ model, task, testCase, dryRun });
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
              const execution = await executeCase({ model, task, testCase, dryRun });

              const base = {
                model: modelAlias,
                category: taskName,
                case_id: testCase.id,
                prompt: execution.prompt,
                response: execution.response,
                interaction: execution.interaction,
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
