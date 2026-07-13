import { createHash } from "node:crypto";
import { chmodSync, existsSync, rmSync } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  assertExactKeys,
  isPlainObject,
  parseStrictJson,
  stableJson,
} from "./protocol.mjs";

const MAX_RUNTIME_FILES = 10_000;
const MAX_RUNTIME_BYTES = 128 * 1024 * 1024;
const EXPECTED_PACKAGES = Object.freeze({
  openai: "@openclaw/openai-provider",
  codex: "@openclaw/codex",
  ollama: "@openclaw/ollama-provider",
});

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashJson(value) {
  return sha256(stableJson(value));
}

async function canonicalPath(inputPath, label, expectedKind) {
  const absolute = path.resolve(inputPath);
  const before = await lstat(absolute).catch(() => null);
  if (!before) throw new Error(`${label} does not exist: ${absolute}`);
  if (before.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link: ${absolute}`);
  if (expectedKind === "file" && !before.isFile()) throw new Error(`${label} must be a regular file: ${absolute}`);
  if (expectedKind === "directory" && !before.isDirectory()) throw new Error(`${label} must be a directory: ${absolute}`);
  const canonical = await realpath(absolute);
  if (canonical !== absolute) throw new Error(`${label} must already be canonical: ${absolute}`);
  const after = await lstat(canonical);
  if (after.isSymbolicLink()) throw new Error(`${label} resolved to a symbolic link: ${canonical}`);
  return canonical;
}

function assertInside(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return;
  throw new Error(`${label} escapes its verified plugin root`);
}

export async function hashRegularFile(filePath, label = "file") {
  const canonical = await canonicalPath(filePath, label, "file");
  return { path: canonical, sha256: sha256(await readFile(canonical)) };
}

async function collectRuntimeFiles(root, directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Plugin runtime contains a symbolic link: ${candidate}`);
    if (entry.isDirectory()) {
      await collectRuntimeFiles(root, candidate, files);
      continue;
    }
    if (!entry.isFile()) throw new Error(`Plugin runtime contains an unsupported filesystem entry: ${candidate}`);
    files.push(candidate);
    if (files.length > MAX_RUNTIME_FILES) throw new Error(`Plugin runtime contains more than ${MAX_RUNTIME_FILES} files`);
  }
}

async function hashRuntimeDirectory(directory, label) {
  const canonical = await canonicalPath(directory, label, "directory");
  const files = [];
  await collectRuntimeFiles(canonical, canonical, files);
  const hash = createHash("sha256");
  let totalBytes = 0;
  for (const filePath of files) {
    const bytes = await readFile(filePath);
    totalBytes += bytes.length;
    if (totalBytes > MAX_RUNTIME_BYTES) throw new Error(`${label} exceeds ${MAX_RUNTIME_BYTES} verified bytes`);
    hash.update(path.relative(canonical, filePath));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return {
    path: canonical,
    sha256: hash.digest("hex"),
    fileCount: files.length,
    bytes: totalBytes,
  };
}

function parseModel(model) {
  const slash = model.indexOf("/");
  if (slash <= 0 || slash === model.length - 1) throw new Error("Model must be provider/model");
  return { provider: model.slice(0, slash), modelId: model.slice(slash + 1) };
}

function readPluginIndex(sourceStateDir) {
  const sourcePath = path.join(sourceStateDir, "openclaw.sqlite");
  if (!existsSync(sourcePath)) throw new Error(`OpenClaw plugin registry database not found: ${sourcePath}`);
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    const row = source.prepare("SELECT * FROM installed_plugin_index WHERE index_key = ?").get("installed-plugin-index");
    if (!row) throw new Error("OpenClaw source state has no installed plugin index");
    const registryJsonLimits = { maxValues: 250_000, maxDepth: 128 };
    const plugins = parseStrictJson(row.plugins_json, "OpenClaw plugin registry plugins_json", registryJsonLimits);
    const installRecords = parseStrictJson(row.install_records_json, "OpenClaw plugin registry install_records_json", registryJsonLimits);
    if (!Array.isArray(plugins)) throw new Error("OpenClaw plugin registry plugins_json must be an array");
    if (!isPlainObject(installRecords)) throw new Error("OpenClaw plugin registry install_records_json must be an object");
    return { row, plugins, installRecords };
  } finally {
    source.close();
  }
}

async function bundledPluginEntry(openclawRoot, pluginId, openclawVersion) {
  const rootDir = path.join(openclawRoot, "dist", "extensions", pluginId);
  const manifestPath = path.join(rootDir, "openclaw.plugin.json");
  const source = path.join(rootDir, "index.js");
  const packageJsonPath = path.join(rootDir, "package.json");
  const packageJson = parseStrictJson(await readFile(packageJsonPath, "utf8"), `${pluginId} package.json`);
  return {
    pluginId,
    manifestPath,
    manifestHash: sha256(await readFile(manifestPath)),
    source,
    rootDir,
    origin: "bundled",
    enabled: true,
    startup: { agentHarnesses: [] },
    contributions: { providers: pluginId === "ollama" ? ["ollama", "ollama-cloud"] : [pluginId] },
    packageName: packageJson.name,
    packageVersion: packageJson.version ?? openclawVersion,
    packageJson: {
      path: "package.json",
      hash: sha256(await readFile(packageJsonPath)),
    },
  };
}

async function verifyPluginEntry(entry, {
  expectedId,
  openclawRoot,
  openclawVersion,
  installRecord,
}) {
  if (!isPlainObject(entry) || entry.pluginId !== expectedId) throw new Error(`Missing exact ${expectedId} plugin registry entry`);
  if (entry.packageName !== EXPECTED_PACKAGES[expectedId]) throw new Error(`${expectedId} plugin package identity is unverified`);
  if (entry.packageVersion !== openclawVersion) throw new Error(`${expectedId} plugin runtime version does not match OpenClaw ${openclawVersion}`);
  if (expectedId === "openai" || expectedId === "ollama") {
    if (entry.origin !== "bundled") throw new Error(`${expectedId} provider plugin is not bundled`);
  } else if (entry.origin !== "global") {
    throw new Error("Codex runtime plugin is not a verified global install");
  }

  const rootDir = await canonicalPath(entry.rootDir, `${expectedId} plugin root`, "directory");
  const source = await canonicalPath(entry.source, `${expectedId} plugin source`, "file");
  const manifestPath = await canonicalPath(entry.manifestPath, `${expectedId} plugin manifest`, "file");
  assertInside(rootDir, source, `${expectedId} plugin source`);
  assertInside(rootDir, manifestPath, `${expectedId} plugin manifest`);
  if (expectedId === "openai" || expectedId === "ollama") {
    assertInside(path.join(openclawRoot, "dist", "extensions", expectedId), rootDir, `${expectedId} plugin root`);
  } else {
    if (!isPlainObject(installRecord)) throw new Error("Codex plugin install record is missing");
    if (
      installRecord.resolvedName !== EXPECTED_PACKAGES.codex
      || installRecord.resolvedVersion !== openclawVersion
      || installRecord.version !== openclawVersion
      || typeof installRecord.integrity !== "string"
      || !installRecord.integrity.startsWith("sha512-")
    ) {
      throw new Error("Codex plugin install record is not pinned to the active runtime version");
    }
    const installPath = await canonicalPath(installRecord.installPath, "Codex plugin install path", "directory");
    if (installPath !== rootDir) throw new Error("Codex plugin root does not match its install record");
  }

  const manifest = await hashRegularFile(manifestPath, `${expectedId} plugin manifest`);
  if (entry.manifestHash !== manifest.sha256) throw new Error(`${expectedId} plugin manifest hash does not match the registry`);
  const packageJsonPath = await canonicalPath(path.join(rootDir, entry.packageJson?.path || "package.json"), `${expectedId} package.json`, "file");
  assertInside(rootDir, packageJsonPath, `${expectedId} package.json`);
  const packageJson = await hashRegularFile(packageJsonPath, `${expectedId} package.json`);
  if (entry.packageJson?.hash !== packageJson.sha256) throw new Error(`${expectedId} package.json hash does not match the registry`);
  const packageDocument = parseStrictJson(await readFile(packageJsonPath, "utf8"), `${expectedId} package.json`);
  if (packageDocument.name !== EXPECTED_PACKAGES[expectedId] || packageDocument.version !== openclawVersion) {
    throw new Error(`${expectedId} package.json identity does not match the active OpenClaw version`);
  }
  if (!Array.isArray(entry.contributions?.providers) || !entry.contributions.providers.includes(expectedId)) {
    throw new Error(`${expectedId} plugin does not own its required provider`);
  }
  if (expectedId === "codex" && !entry.startup?.agentHarnesses?.includes("codex")) {
    throw new Error("Codex plugin does not own the codex agent harness");
  }

  const runtime = await hashRuntimeDirectory(path.dirname(source), `${expectedId} plugin runtime`);
  return {
    pluginId: expectedId,
    packageName: entry.packageName,
    packageVersion: entry.packageVersion,
    origin: entry.origin,
    rootDir,
    source,
    manifestPath,
    manifestSha256: manifest.sha256,
    packageJsonSha256: packageJson.sha256,
    runtimeSha256: runtime.sha256,
    runtimeFileCount: runtime.fileCount,
    runtimeBytes: runtime.bytes,
  };
}

export async function loadRuntimeProvenance({
  openclawBin,
  openclawVersion,
  model,
  pluginRegistrySourceStateDir,
}) {
  const binary = await hashRegularFile(openclawBin, "OpenClaw binary");
  const openclawRoot = path.dirname(binary.path);
  const { provider } = parseModel(model);
  let expectedPluginIds;
  let registrySnapshot = null;
  let entries;
  let installRecords = {};

  if (provider === "openai") {
    if (!pluginRegistrySourceStateDir) throw new Error("openai/* evaluation requires --plugin-registry-source-state-dir");
    const sourceStateDir = await canonicalPath(pluginRegistrySourceStateDir, "OpenClaw plugin registry source", "directory");
    const loaded = readPluginIndex(sourceStateDir);
    if (loaded.row.host_contract_version !== openclawVersion) {
      throw new Error(`Plugin registry runtime version ${loaded.row.host_contract_version} does not match OpenClaw ${openclawVersion}`);
    }
    expectedPluginIds = ["openai", "codex"];
    entries = expectedPluginIds.map((id) => {
      const matches = loaded.plugins.filter((plugin) => plugin?.pluginId === id);
      if (matches.length !== 1) throw new Error(`OpenClaw registry requires exactly one ${id} plugin entry`);
      return matches[0];
    });
    installRecords = Object.fromEntries(
      Object.entries(loaded.installRecords).filter(([id]) => expectedPluginIds.includes(id)),
    );
    if (Object.keys(installRecords).some((id) => id !== "codex")) throw new Error("Plugin registry selected an unexpected install record");
    registrySnapshot = {
      row: loaded.row,
      plugins: entries,
      installRecords,
    };
  } else if (provider === "ollama") {
    expectedPluginIds = ["ollama"];
    entries = [await bundledPluginEntry(openclawRoot, "ollama", openclawVersion)];
  } else {
    throw new Error(`Unsupported model provider for isolated bridge: ${provider}`);
  }

  const identities = [];
  for (const entry of entries) {
    identities.push(await verifyPluginEntry(entry, {
      expectedId: entry.pluginId,
      openclawRoot,
      openclawVersion,
      installRecord: installRecords[entry.pluginId],
    }));
  }
  if (stableJson(identities.map((identity) => identity.pluginId).sort()) !== stableJson([...expectedPluginIds].sort())) {
    throw new Error("Verified runtime plugin IDs do not exactly match the selected model");
  }
  return {
    identity: {
      openclaw: {
        path: binary.path,
        version: openclawVersion,
        sha256: binary.sha256,
      },
      plugins: identities,
    },
    registrySnapshot,
  };
}

export function copyInferenceAuthStore(sourceAgentDir, targetAgentDir, model) {
  const { provider } = parseModel(model);
  const sourcePath = path.join(sourceAgentDir, "openclaw-agent.sqlite");
  if (!existsSync(sourcePath)) throw new Error(`OpenClaw auth source database not found: ${sourcePath}`);
  const targetPath = path.join(targetAgentDir, "openclaw-agent.sqlite");
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  const target = new DatabaseSync(targetPath);
  let selectedProfileId;
  let succeeded = false;
  try {
    chmodSync0600(targetPath);
    const storeRows = source.prepare("SELECT store_key, store_json, updated_at FROM auth_profile_store").all();
    const primaryStore = storeRows.filter((row) => row.store_key === "primary");
    if (primaryStore.length !== 1) throw new Error("OpenClaw auth source requires exactly one primary model profile store");
    const store = parseStrictJson(primaryStore[0].store_json, "OpenClaw auth profile store");
    assertExactKeys(store, ["version", "profiles"], "OpenClaw auth profile store");
    if (!isPlainObject(store.profiles)) throw new Error("OpenClaw auth profile store profiles must be an object");
    const matches = Object.entries(store.profiles).filter(([, profile]) => profile?.provider === provider);
    if (matches.length !== 1) throw new Error(`OpenClaw auth source requires exactly one ${provider} profile; found ${matches.length}`);
    [[selectedProfileId]] = matches;
    const selectedProfile = matches[0][1];
    if (!isPlainObject(selectedProfile) || typeof selectedProfile.type !== "string") throw new Error("Selected OpenClaw auth profile is malformed");
    if (selectedProfile.type === "oauth") {
      if (typeof selectedProfile.access !== "string" || !selectedProfile.access || typeof selectedProfile.refresh !== "string" || !selectedProfile.refresh) {
        throw new Error("Selected OpenClaw OAuth profile is incomplete");
      }
    } else if (typeof selectedProfile.key !== "string" || !selectedProfile.key) {
      throw new Error("Selected OpenClaw API-key profile is incomplete");
    }

    const stateRows = source.prepare("SELECT state_key, state_json, updated_at FROM auth_profile_state").all();
    const primaryState = stateRows.filter((row) => row.state_key === "primary");
    if (primaryState.length !== 1) throw new Error("OpenClaw auth source requires exactly one primary profile state row");
    const state = parseStrictJson(primaryState[0].state_json, "OpenClaw auth profile state");
    assertExactKeys(state, ["version", "order"], "OpenClaw auth profile state");
    const providerOrder = state.order?.[provider];
    if (!Array.isArray(providerOrder) || providerOrder.filter((id) => id === selectedProfileId).length !== 1) {
      throw new Error("Selected OpenClaw auth profile is missing or ambiguous in provider order");
    }

    target.exec(`
      CREATE TABLE auth_profile_store (
        store_key TEXT NOT NULL PRIMARY KEY,
        store_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE auth_profile_state (
        state_key TEXT NOT NULL PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    target.prepare("INSERT INTO auth_profile_store(store_key, store_json, updated_at) VALUES (?, ?, ?)").run(
      "primary",
      JSON.stringify({ version: store.version, profiles: { [selectedProfileId]: selectedProfile } }),
      primaryStore[0].updated_at,
    );
    target.prepare("INSERT INTO auth_profile_state(state_key, state_json, updated_at) VALUES (?, ?, ?)").run(
      "primary",
      JSON.stringify({ version: state.version, order: { [provider]: [selectedProfileId] } }),
      primaryState[0].updated_at,
    );
    succeeded = true;
  } finally {
    target.close();
    source.close();
    if (!succeeded) {
      rmSync(targetPath, { force: true });
      rmSync(`${targetPath}-wal`, { force: true });
      rmSync(`${targetPath}-shm`, { force: true });
    }
  }
  chmodSync0600(targetPath);
  return {
    path: targetPath,
    provider,
    profileIdSha256: sha256(selectedProfileId),
  };
}

function chmodSync0600(filePath) {
  chmodSync(filePath, 0o600);
}

export async function copyPluginRegistrySnapshot(snapshot, targetStateDir) {
  if (!snapshot) throw new Error("A verified plugin registry snapshot is required");
  const targetRoot = path.join(targetStateDir, "state");
  await mkdir(targetRoot, { recursive: true, mode: 0o700 });
  const targetPath = path.join(targetRoot, "openclaw.sqlite");
  const target = new DatabaseSync(targetPath);
  let succeeded = false;
  try {
    await chmod(targetPath, 0o600);
    target.exec(`
      CREATE TABLE installed_plugin_index (
        index_key TEXT NOT NULL PRIMARY KEY,
        version INTEGER NOT NULL,
        host_contract_version TEXT NOT NULL,
        compat_registry_version TEXT NOT NULL,
        migration_version INTEGER NOT NULL,
        policy_hash TEXT NOT NULL,
        generated_at_ms INTEGER NOT NULL,
        refresh_reason TEXT,
        install_records_json TEXT NOT NULL,
        plugins_json TEXT NOT NULL,
        diagnostics_json TEXT NOT NULL,
        warning TEXT,
        updated_at_ms INTEGER NOT NULL
      );
    `);
    const row = snapshot.row;
    target.prepare(`
      INSERT INTO installed_plugin_index(
        index_key, version, host_contract_version, compat_registry_version,
        migration_version, policy_hash, generated_at_ms, refresh_reason,
        install_records_json, plugins_json, diagnostics_json, warning, updated_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.index_key,
      row.version,
      row.host_contract_version,
      row.compat_registry_version,
      row.migration_version,
      row.policy_hash,
      row.generated_at_ms,
      "clawbotomy-minimized-snapshot",
      JSON.stringify(snapshot.installRecords),
      JSON.stringify(snapshot.plugins),
      "[]",
      null,
      row.updated_at_ms,
    );
    succeeded = true;
  } finally {
    target.close();
    if (!succeeded) {
      await rm(targetPath, { force: true });
      await rm(`${targetPath}-wal`, { force: true });
      await rm(`${targetPath}-shm`, { force: true });
    }
  }
  await chmod(targetPath, 0o600);
  return targetPath;
}

export async function removeCredentialSnapshot(authSnapshot) {
  if (!authSnapshot?.path) return;
  await Promise.all([
    rm(authSnapshot.path, { force: true }),
    rm(`${authSnapshot.path}-wal`, { force: true }),
    rm(`${authSnapshot.path}-shm`, { force: true }),
  ]);
}

export async function integrationPluginIdentity(integrationRoot) {
  const root = await canonicalPath(integrationRoot, "Clawbotomy integration root", "directory");
  const source = await hashRegularFile(path.join(root, "src", "index.ts"), "Clawbotomy plugin source");
  const manifestPath = path.join(root, "openclaw.plugin.json");
  const packageJsonPath = path.join(root, "package.json");
  const manifest = await hashRegularFile(manifestPath, "Clawbotomy plugin manifest");
  const packageJson = await hashRegularFile(packageJsonPath, "Clawbotomy plugin package.json");
  const manifestDocument = parseStrictJson(await readFile(manifestPath, "utf8"), "Clawbotomy plugin manifest");
  const packageDocument = parseStrictJson(await readFile(packageJsonPath, "utf8"), "Clawbotomy plugin package.json");
  if (
    manifestDocument.id !== "clawbotomy-openclaw-tools"
    || packageDocument.name !== "@clawbotomy/openclaw-bridge"
    || typeof packageDocument.version !== "string"
    || !packageDocument.version
    || stableJson(packageDocument.openclaw?.extensions) !== stableJson(["./src/index.ts"])
  ) {
    throw new Error("Clawbotomy integration manifest/package identity is invalid");
  }
  return {
    pluginId: "clawbotomy-openclaw-tools",
    packageName: packageDocument.name,
    packageVersion: packageDocument.version,
    rootDir: root,
    source: source.path,
    sourceSha256: source.sha256,
    manifestSha256: manifest.sha256,
    packageJsonSha256: packageJson.sha256,
  };
}

function exactToolNames(value, expected, label) {
  if (!Array.isArray(value) || value.some((name) => typeof name !== "string")) throw new Error(`${label} must be a string array`);
  if (new Set(value).size !== value.length || stableJson([...value].sort()) !== stableJson([...expected].sort())) {
    throw new Error(`${label} does not exactly match the fixed eight tools`);
  }
}

export async function validateRuntimeInspection(inspection, { integrationIdentity, toolNames }) {
  if (!isPlainObject(inspection) || !isPlainObject(inspection.plugin)) throw new Error("OpenClaw runtime inspection is malformed");
  const plugin = inspection.plugin;
  if (
    plugin.id !== integrationIdentity.pluginId
    || plugin.packageName !== integrationIdentity.packageName
    || plugin.version !== integrationIdentity.packageVersion
    || plugin.status !== "loaded"
    || plugin.origin !== "config"
    || plugin.enabled !== true
    || plugin.activated !== true
    || plugin.imported !== true
  ) {
    throw new Error("OpenClaw runtime inspection did not load the exact Clawbotomy plugin");
  }
  const rootDir = await canonicalPath(plugin.rootDir, "Inspected Clawbotomy plugin root", "directory");
  const source = await canonicalPath(plugin.source, "Inspected Clawbotomy plugin source", "file");
  if (rootDir !== integrationIdentity.rootDir || source !== integrationIdentity.source) {
    throw new Error("OpenClaw runtime inspection resolved unexpected plugin implementation paths");
  }
  const sourceHash = await hashRegularFile(source, "Inspected Clawbotomy plugin source");
  if (sourceHash.sha256 !== integrationIdentity.sourceSha256) throw new Error("OpenClaw inspected plugin implementation hash changed");
  exactToolNames(plugin.toolNames, toolNames, "OpenClaw inspected plugin.toolNames");
  exactToolNames(plugin.contracts?.tools, toolNames, "OpenClaw inspected plugin contracts");
  if (!Array.isArray(inspection.tools) || inspection.tools.length !== toolNames.length) {
    throw new Error("OpenClaw runtime inspection did not register exactly eight tools");
  }
  const ownedTools = [];
  for (const [index, tool] of inspection.tools.entries()) {
    assertExactKeys(tool, ["names", "optional"], `OpenClaw runtime inspection tool ${index + 1}`);
    if (tool.optional !== false || !Array.isArray(tool.names) || tool.names.length !== 1 || typeof tool.names[0] !== "string") {
      throw new Error("OpenClaw runtime inspection contains an invalid or optional tool registration");
    }
    ownedTools.push(tool.names[0]);
  }
  exactToolNames(ownedTools, toolNames, "OpenClaw runtime inspection registered tools");
  for (const field of ["diagnostics", "commands", "cliCommands", "services", "gatewayMethods", "mcpServers", "lspServers"]) {
    if (!Array.isArray(inspection[field]) || inspection[field].length !== 0) {
      throw new Error(`OpenClaw runtime inspection exposed unexpected ${field}`);
    }
  }
  const identity = {
    pluginId: plugin.id,
    packageName: plugin.packageName,
    packageVersion: plugin.version,
    rootDir,
    source,
    sourceSha256: sourceHash.sha256,
    manifestSha256: integrationIdentity.manifestSha256,
    packageJsonSha256: integrationIdentity.packageJsonSha256,
    toolNames: ownedTools,
  };
  return { ...identity, inspectionSha256: hashJson(identity) };
}
