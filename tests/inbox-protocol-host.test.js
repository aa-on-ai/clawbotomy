const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const test = require('node:test');

const { validateBundle } = require('../inbox/bundle');
const {
  MESSAGE_SCHEMA_ID,
  PROTOCOL_ID,
} = require('../inbox/protocols/stdio-jsonl');
const { ProtocolConformanceClient } = require('./helpers/protocol-conformance-client');

const repoRoot = path.resolve(__dirname, '..');
const hostPath = path.join(repoRoot, 'inbox', 'host-index.js');
const fixturePlanPath = path.join(__dirname, 'fixtures', 'inbox-plan.v1.json');
const HOST_FRAME_TYPES = new Set([
  'hello_ack',
  'case_start',
  'tool_result',
  'approval_result',
  'control',
  'case_closed',
  'run_complete',
  'error',
]);

function freshRepo(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbotomy-protocol-host-'));
  const planPath = path.join(directory, 'plan.json');
  fs.copyFileSync(fixturePlanPath, planPath);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { directory, planPath };
}

function spawnProtocolHost({ directory, planPath }) {
  const child = spawn(process.execPath, [
    hostPath,
    '--plan', planPath,
    '--protocol', PROTOCOL_ID,
  ], {
    cwd: directory,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.on('error', () => {
    // A failing child may close stdin while a deliberately invalid frame is being flushed.
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const exit = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  return { child, exit, stderr: () => stderr };
}

async function writeJsonLine(stream, frame) {
  if (!stream.write(`${JSON.stringify(frame)}\n`, 'utf8')) await once(stream, 'drain');
}

function parseProtocolLine(line) {
  assert.notEqual(line, '', 'protocol stdout cannot contain blank lines');
  let frame;
  assert.doesNotThrow(() => {
    frame = JSON.parse(line);
  }, `protocol stdout must contain JSON only: ${line}`);
  assert.equal(frame.schemaId, MESSAGE_SCHEMA_ID);
  assert.equal(frame.protocolId, PROTOCOL_ID);
  assert.equal(Number.isSafeInteger(frame.hostSeq) && frame.hostSeq > 0, true);
  assert.equal(HOST_FRAME_TYPES.has(frame.type), true, `unexpected host frame: ${frame.type}`);
  return frame;
}

function runEntries(directory) {
  const runsRoot = path.join(directory, '.clawbotomy', 'inbox-runs');
  if (!fs.existsSync(runsRoot)) return [];
  return fs.readdirSync(runsRoot);
}

function completeBundleDirectories(directory) {
  const runsRoot = path.join(directory, '.clawbotomy', 'inbox-runs');
  return runEntries(directory).filter((name) => (
    fs.existsSync(path.join(runsRoot, name, 'manifest.json'))
    && fs.existsSync(path.join(runsRoot, name, 'cases.jsonl'))
    && fs.existsSync(path.join(runsRoot, name, 'summary.json'))
    && fs.existsSync(path.join(runsRoot, name, 'integrity.json'))
  ));
}

test('the actual stdio child completes 36 cases and writes an exactly replayable bundle', {
  timeout: 30_000,
}, async (t) => {
  const fixture = freshRepo(t);
  const { child, exit, stderr } = spawnProtocolHost(fixture);
  const client = new ProtocolConformanceClient();
  const frames = [];
  let caseStarts = 0;
  let stdinClosed = false;

  await writeJsonLine(child.stdin, client.hello());
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  for await (const line of lines) {
    const hostFrame = parseProtocolLine(line);
    frames.push(hostFrame);
    if (hostFrame.type === 'case_start') caseStarts += 1;

    const clientFrames = client.handleHostFrame(hostFrame);
    for (const clientFrame of clientFrames) {
      await writeJsonLine(child.stdin, clientFrame);
      if (
        !stdinClosed
        && caseStarts === 36
        && clientFrame.type === 'case_complete'
      ) {
        stdinClosed = true;
        child.stdin.end();
      }
    }
  }

  const outcome = await exit;
  assert.deepEqual(outcome, { code: 0, signal: null });
  assert.equal(stderr(), '');
  assert.equal(caseStarts, 36);
  assert.equal(stdinClosed, true);
  assert.ok(frames.length > 0);
  assert.equal(frames.at(-1).type, 'run_complete');
  assert.equal(frames.filter((frame) => frame.type === 'run_complete').length, 1);
  assert.equal(frames.some((frame) => frame.type === 'error'), false);

  const receipt = frames.at(-1);
  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.cases, 36);
  assert.equal(receipt.passed, 36);
  assert.equal(receipt.failed, 0);
  const receiptOutputDir = path.resolve(fixture.directory, receipt.outputDir);
  assert.equal(
    fs.realpathSync(path.dirname(path.dirname(path.dirname(receiptOutputDir)))),
    fs.realpathSync(fixture.directory),
  );
  assert.equal(path.isAbsolute(receipt.outputDir), false);
  assert.equal(fs.existsSync(receiptOutputDir), true);
  assert.deepEqual(completeBundleDirectories(fixture.directory), [receipt.runId]);

  const validated = await validateBundle(fs.realpathSync(receiptOutputDir), {
    repoRoot: fs.realpathSync(fixture.directory),
  });
  assert.equal(validated.manifest.runId, receipt.runId);
  assert.equal(validated.records.length, 36);
  assert.equal(validated.summary.totals.passedCases, 36);
  assert.equal(validated.summary.totals.failedCases, 0);
  assert.equal(validated.replay.coreDigest, receipt.coreDigest);
  assert.deepEqual(
    validated.replay.records.map((record) => record.digests.record),
    validated.records.map((record) => record.digests.record),
  );
});

for (const failure of [
  {
    name: 'malformed JSONL',
    write: async (child) => {
      child.stdin.end('{"schemaId":\n', 'utf8');
    },
  },
  {
    name: 'early EOF after hello',
    write: async (child) => {
      const client = new ProtocolConformanceClient();
      child.stdin.end(`${JSON.stringify(client.hello())}\n`, 'utf8');
    },
  },
]) {
  test(`${failure.name} exits one with a terminal error frame and no complete bundle`, {
    timeout: 10_000,
  }, async (t) => {
    const fixture = freshRepo(t);
    const { child, exit, stderr } = spawnProtocolHost(fixture);
    await failure.write(child);

    const frames = [];
    const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    for await (const line of lines) frames.push(parseProtocolLine(line));
    const outcome = await exit;

    assert.deepEqual(outcome, { code: 1, signal: null });
    assert.ok(frames.length >= 1);
    assert.equal(frames.at(-1).type, 'error');
    assert.equal(frames.at(-1).completeBundleWritten, false);
    assert.equal(frames.some((frame) => frame.type === 'run_complete'), false);
    assert.match(stderr(), /No complete evidence bundle was written\./);
    assert.deepEqual(runEntries(fixture.directory), []);
  });
}
