import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { hashRuntimeDirectory } from "./provenance.mjs";

test("runtime manifest hashing distinguishes the former path-kind-bytes prefix collision", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "clawbotomy-runtime-hash-"));
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
