import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExactKeys,
  isPlainObject,
  parseStrictJson,
  stableJson,
} from "./protocol.mjs";

export const INTERVENTION_PACK_SCHEMA = "clawbotomy.intervention-pack/v1";
export const INTERVENTION_DIGEST_SCHEMA = "clawbotomy.intervention-pack-digest/v1";
export const COMPLETION_EVIDENCE_INTERVENTION_ID = "completion-evidence-gate";
export const COMPLETION_EVIDENCE_SKILL_NAME = "clawbotomy-completion-evidence";

const MAX_PACKAGE_FILE_BYTES = 64 * 1024;
const MAX_PACKAGE_BYTES = 256 * 1024;
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES_ROOT = path.resolve(MODULE_DIRECTORY, "../../interventions");
const EXPECTED_FILE_PATHS = Object.freeze([
  "SKILL.md",
  "manifest.json",
  "references/behavior-contract.md",
  "references/hermes-install.md",
  "references/openclaw-install.md",
]);
const MANIFEST_FILE_PATHS = Object.freeze(EXPECTED_FILE_PATHS.filter((entry) => entry !== "manifest.json"));
const PACK_CATALOG = Object.freeze({
  [COMPLETION_EVIDENCE_INTERVENTION_ID]: "completion-evidence-gate",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertString(value, label, pattern) {
  if (typeof value !== "string" || !value || (pattern && !pattern.test(value))) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean.`);
}

function assertExactStringArray(value, expected, label) {
  if (!Array.isArray(value) || value.length !== expected.length) {
    throw new Error(`${label} must contain the exact allowlisted values.`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (value[index] !== expected[index]) {
      throw new Error(`${label} must contain the exact allowlisted values.`);
    }
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function assertModePrivate(stats, label) {
  if ((stats.mode & 0o022) !== 0) {
    throw new Error(`${label} must not be writable by group or world.`);
  }
}

async function canonicalDirectory(directory, label) {
  const absolute = path.resolve(directory);
  const before = await lstat(absolute).catch(() => null);
  if (!before) throw new Error(`${label} does not exist.`);
  if (before.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link.`);
  if (!before.isDirectory()) throw new Error(`${label} must be a directory.`);
  assertModePrivate(before, label);
  const canonical = await realpath(absolute);
  if (canonical !== absolute) throw new Error(`${label} must already be canonical.`);
  const after = await lstat(canonical);
  if (!after.isDirectory() || after.isSymbolicLink() || !sameFileIdentity(before, after)) {
    throw new Error(`${label} changed during validation.`);
  }
  return canonical;
}

async function collectPackageSurface(root, directory = root, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    const stats = await lstat(candidate);
    const relative = path.relative(root, candidate).split(path.sep).join("/");
    if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) {
      throw new Error("Intervention package entry escapes its package root.");
    }
    if (entry.isSymbolicLink() || stats.isSymbolicLink()) {
      throw new Error(`Intervention package must not contain symbolic links: ${relative}`);
    }
    assertModePrivate(stats, `Intervention package entry ${relative}`);
    if (entry.isDirectory()) {
      await collectPackageSurface(root, candidate, files);
      continue;
    }
    if (!entry.isFile() || !stats.isFile()) {
      throw new Error(`Intervention package contains an unsupported entry: ${relative}`);
    }
    files.push(relative);
  }
  return files;
}

async function readPackageFile(root, relativePath) {
  if (!EXPECTED_FILE_PATHS.includes(relativePath)) {
    throw new Error(`Unexpected intervention package file: ${relativePath}`);
  }
  const candidate = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Intervention package file escapes its package root: ${relativePath}`);
  }
  const expected = await lstat(candidate).catch(() => null);
  if (!expected || expected.isSymbolicLink() || !expected.isFile()) {
    throw new Error(`Intervention package file must be a regular non-symlink file: ${relativePath}`);
  }
  assertModePrivate(expected, `Intervention package file ${relativePath}`);
  if (!Number.isSafeInteger(expected.size) || expected.size < 1 || expected.size > MAX_PACKAGE_FILE_BYTES) {
    throw new Error(`Intervention package file ${relativePath} exceeds the ${MAX_PACKAGE_FILE_BYTES}-byte limit.`);
  }
  const handle = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    if (!before.isFile() || !sameFileIdentity(expected, before)) {
      throw new Error(`Intervention package file changed before read: ${relativePath}`);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const current = await lstat(candidate);
    if (
      !after.isFile()
      || !current.isFile()
      || current.isSymbolicLink()
      || !sameFileIdentity(before, after)
      || !sameFileIdentity(after, current)
      || after.size !== before.size
      || bytes.length !== before.size
    ) {
      throw new Error(`Intervention package file changed during read: ${relativePath}`);
    }
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`Intervention package file is not valid UTF-8: ${relativePath}`);
    }
    return Object.freeze({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes), text });
  } finally {
    await handle.close();
  }
}

function validateManifest(manifest, expectedId, fileRecords) {
  assertExactKeys(manifest, [
    "schemaId",
    "id",
    "version",
    "status",
    "recommendationId",
    "skillName",
    "behavior",
    "applicability",
    "authorizationStatus",
    "productionAccessChanged",
    "files",
  ], "intervention manifest");
  if (manifest.schemaId !== INTERVENTION_PACK_SCHEMA) throw new Error("Unsupported intervention manifest schema.");
  if (manifest.id !== expectedId || manifest.id !== COMPLETION_EVIDENCE_INTERVENTION_ID) {
    throw new Error("Intervention manifest ID does not match the fixed package ID.");
  }
  if (manifest.version !== "0.1.0-experimental") throw new Error("Unexpected intervention package version.");
  if (manifest.status !== "private_experiment_unvalidated") throw new Error("Unexpected intervention package status.");
  if (manifest.recommendationId !== "evidence-integrity") throw new Error("Unexpected intervention recommendation ID.");
  if (manifest.skillName !== COMPLETION_EVIDENCE_SKILL_NAME) throw new Error("Unexpected intervention skill name.");
  if (manifest.authorizationStatus !== "non-authorizing") throw new Error("Intervention package must be non-authorizing.");
  assertBoolean(manifest.productionAccessChanged, "productionAccessChanged");
  if (manifest.productionAccessChanged !== false) throw new Error("Intervention package cannot change production access.");

  assertExactKeys(manifest.behavior, ["trigger", "requiredEvidence", "missingEvidenceBehavior"], "intervention behavior");
  if (manifest.behavior.trigger !== "before_any_completion_claim") throw new Error("Unexpected intervention trigger.");
  assertExactStringArray(
    manifest.behavior.requiredEvidence,
    ["successful_tool_result", "matching_observed_state"],
    "intervention requiredEvidence",
  );
  if (manifest.behavior.missingEvidenceBehavior !== "report_unverified_and_stop") {
    throw new Error("Unexpected missing-evidence behavior.");
  }

  assertExactKeys(manifest.applicability, ["adapters", "phase", "runtimeActivation"], "intervention applicability");
  assertExactStringArray(manifest.applicability.adapters, ["openclaw"], "intervention adapters");
  if (manifest.applicability.phase !== 9) throw new Error("Unexpected intervention phase.");
  if (manifest.applicability.runtimeActivation !== "isolated_workspace_only") {
    throw new Error("Intervention activation must be isolated-workspace-only.");
  }

  if (!Array.isArray(manifest.files) || manifest.files.length !== MANIFEST_FILE_PATHS.length) {
    throw new Error("Intervention manifest must bind the exact package file set.");
  }
  for (let index = 0; index < MANIFEST_FILE_PATHS.length; index += 1) {
    const entry = manifest.files[index];
    assertExactKeys(entry, ["path", "sha256", "bytes"], `intervention file record ${index}`);
    const expectedPath = MANIFEST_FILE_PATHS[index];
    if (entry.path !== expectedPath) throw new Error("Intervention manifest file order or path is invalid.");
    assertString(entry.sha256, `intervention file ${expectedPath} sha256`, /^[a-f0-9]{64}$/u);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > MAX_PACKAGE_FILE_BYTES) {
      throw new Error(`Intervention file ${expectedPath} byte count is invalid.`);
    }
    const actual = fileRecords.get(expectedPath);
    if (!actual || actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes) {
      throw new Error(`Intervention file digest or byte count mismatch: ${expectedPath}`);
    }
  }

  const skillText = fileRecords.get("SKILL.md")?.text || "";
  for (const requiredMarker of [
    "name: clawbotomy-completion-evidence",
    "version: 0.1.0-experimental",
    "intervention-id: completion-evidence-gate",
    "authorization: non-authorizing",
  ]) {
    if (!skillText.includes(requiredMarker)) throw new Error(`Intervention skill is missing required marker: ${requiredMarker}`);
  }
  return manifest;
}

function freezePack(pack) {
  Object.freeze(pack.files);
  Object.freeze(pack.safeProjection);
  return Object.freeze(pack);
}

export async function validateInterventionPackDirectory(packageDirectory, expectedId = COMPLETION_EVIDENCE_INTERVENTION_ID) {
  const root = await canonicalDirectory(packageDirectory, "Intervention package directory");
  const surface = (await collectPackageSurface(root)).sort();
  const expectedSurface = [...EXPECTED_FILE_PATHS].sort();
  if (stableJson(surface) !== stableJson(expectedSurface)) {
    throw new Error(`Intervention package file surface must be exactly: ${EXPECTED_FILE_PATHS.join(", ")}`);
  }
  const records = await Promise.all(EXPECTED_FILE_PATHS.map((relativePath) => readPackageFile(root, relativePath)));
  const totalBytes = records.reduce((total, record) => total + record.bytes, 0);
  if (totalBytes > MAX_PACKAGE_BYTES) throw new Error(`Intervention package exceeds ${MAX_PACKAGE_BYTES} bytes.`);
  const fileRecords = new Map(records.map((record) => [record.path, record]));
  const manifest = parseStrictJson(fileRecords.get("manifest.json").text, "intervention manifest", {
    maxValues: 256,
    maxDepth: 8,
  });
  validateManifest(manifest, expectedId, fileRecords);
  const digestRecords = MANIFEST_FILE_PATHS.map((relativePath) => {
    const record = fileRecords.get(relativePath);
    return { path: record.path, bytes: record.bytes, sha256: record.sha256 };
  });
  const packSha256 = sha256(stableJson({
    schemaId: INTERVENTION_DIGEST_SCHEMA,
    manifest,
    files: digestRecords,
  }));
  return freezePack({
    id: manifest.id,
    version: manifest.version,
    status: manifest.status,
    recommendationId: manifest.recommendationId,
    skillName: manifest.skillName,
    packSha256,
    packageDirectory: root,
    files: records,
    safeProjection: {
      id: manifest.id,
      version: manifest.version,
      status: manifest.status,
      recommendationId: manifest.recommendationId,
      skillName: manifest.skillName,
      packSha256,
      authorizationStatus: manifest.authorizationStatus,
      productionAccessChanged: manifest.productionAccessChanged,
    },
  });
}

export async function loadInterventionPack(interventionId) {
  assertString(interventionId, "intervention ID", /^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
  if (!Object.hasOwn(PACK_CATALOG, interventionId)) {
    throw new Error(`Unsupported intervention ID: ${interventionId}`);
  }
  const directory = path.join(PACKAGES_ROOT, PACK_CATALOG[interventionId]);
  return validateInterventionPackDirectory(directory, interventionId);
}

export async function installInterventionPack(pack, workspaceDirectory) {
  if (!pack || pack.id !== COMPLETION_EVIDENCE_INTERVENTION_ID || pack.skillName !== COMPLETION_EVIDENCE_SKILL_NAME) {
    throw new Error("Only the validated completion-evidence intervention pack can be installed.");
  }
  const workspace = await canonicalDirectory(workspaceDirectory, "Intervention workspace");
  const skillsDirectory = path.join(workspace, "skills");
  const skillDirectory = path.join(skillsDirectory, pack.skillName);
  await mkdir(skillsDirectory, { mode: 0o700, recursive: true });
  await mkdir(skillDirectory, { mode: 0o700, recursive: true });
  await mkdir(path.join(skillDirectory, "references"), { mode: 0o700, recursive: true });
  const existing = await lstat(skillDirectory).catch(() => null);
  if (existing) {
    const installed = await validateInterventionPackDirectory(skillDirectory, pack.id).catch(() => null);
    if (installed) {
      if (installed.packSha256 !== pack.packSha256) {
        throw new Error("Installed intervention package digest does not match the reviewed package.");
      }
      return Object.freeze({
        id: pack.id,
        version: pack.version,
        status: pack.status,
        recommendationId: pack.recommendationId,
        skillName: pack.skillName,
        packSha256: pack.packSha256,
        loaded: false,
        sourceClass: "isolated_workspace",
      });
    }
  }
  for (const record of pack.files) {
    const destination = path.join(skillDirectory, ...record.path.split("/"));
    await writeFile(destination, record.text, { flag: "wx", mode: 0o600 });
  }
  const installed = await validateInterventionPackDirectory(skillDirectory, pack.id);
  if (installed.packSha256 !== pack.packSha256) {
    throw new Error("Installed intervention package digest does not match the reviewed package.");
  }
  return Object.freeze({
    id: pack.id,
    version: pack.version,
    status: pack.status,
    recommendationId: pack.recommendationId,
    skillName: pack.skillName,
    packSha256: pack.packSha256,
    loaded: false,
    sourceClass: "isolated_workspace",
  });
}

export function isSupportedInterventionId(value) {
  return typeof value === "string" && Object.hasOwn(PACK_CATALOG, value);
}

export function interventionPackCatalog() {
  return Object.freeze(Object.keys(PACK_CATALOG));
}
