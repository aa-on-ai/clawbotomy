import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { hashRuntimeDirectory, inspectInferenceAuthStore } from "./provenance.mjs";

test("runtime manifest hashing distinguishes the former path-kind-bytes prefix collision", async (t) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "clawbotomy-runtime-hash-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const oneFile = path.join(root, "one-file");
  const twoFiles = path.join(root, "two-files");
  await Promise.all([mkdir(oneFile), mkdir(twoFiles)]);
  await Promise.all([
    writeFile(path.join(oneFile, "a"), Buffer.from("X\0b\0file\0Y", "utf8")),
    writeFile(path.join(twoFiles, "a"), "X"),
    writeFile(path.join(twoFiles, "b"), "Y"),
  ]);

  const [oneDigest, twoDigest] = await Promise.all([
    hashRuntimeDirectory(oneFile),
    hashRuntimeDirectory(twoFiles),
  ]);
  assert.notEqual(oneDigest.sha256, twoDigest.sha256);
  assert.equal(oneDigest.manifestSchema, "clawbotomy.runtime-manifest/v2");
  assert.equal(twoDigest.manifestSchema, "clawbotomy.runtime-manifest/v2");
});

test("auth preflight rejects ambiguous and expired provider profiles without exposing credentials", async (t) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "clawbotomy-auth-preflight-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const databasePath = path.join(root, "openclaw-agent.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE auth_profile_store (store_key TEXT PRIMARY KEY, store_json TEXT, updated_at INTEGER);
    CREATE TABLE auth_profile_state (state_key TEXT PRIMARY KEY, state_json TEXT, updated_at INTEGER);
  `);
  const writeProfile = (profiles, order) => {
    database.exec("DELETE FROM auth_profile_store; DELETE FROM auth_profile_state;");
    database.prepare("INSERT INTO auth_profile_store VALUES (?, ?, ?)").run(
      "primary",
      JSON.stringify({ version: 1, profiles }),
      1,
    );
    database.prepare("INSERT INTO auth_profile_state VALUES (?, ?, ?)").run(
      "primary",
      JSON.stringify({ version: 1, order }),
      1,
    );
  };

  writeProfile({
    first: { provider: "openai", type: "oauth", access: "secret-one", refresh: "refresh-one", expires: 1 },
    second: { provider: "openai", type: "oauth", access: "secret-two", refresh: "refresh-two", expires: 1 },
  }, { openai: ["first", "second"] });
  assert.throws(
    () => inspectInferenceAuthStore(root, "openai/gpt-5.6-sol", { now: () => 2 }),
    /exactly one openai profile; found 2/,
  );

  writeProfile({
    first: { provider: "openai", type: "oauth", access: "secret-one", refresh: "refresh-one", expires: 1 },
  }, { openai: ["first"] });
  assert.throws(
    () => inspectInferenceAuthStore(root, "openai/gpt-5.6-sol", { now: () => 2 }),
    /expired/,
  );
  database.close();
});
