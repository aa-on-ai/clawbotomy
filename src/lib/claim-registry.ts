import registry from '../../claims/registry.json';

export type EvidenceLaneId = keyof typeof registry.lanes;
export type ConfiguredSessionStatus = keyof typeof registry.statusLanguage.configuredAgentSession;
export type CompatibilityStatus = keyof typeof registry.statusLanguage.compatibility;
export type ArtifactDisclosureStatus = keyof typeof registry.statusLanguage.modelBenchmarkArtifactDisclosure;

export const evidenceLanes = registry.lanes;
export const configuredSessionStatusLanguage = registry.statusLanguage.configuredAgentSession;
export const compatibilityStatusLanguage = registry.statusLanguage.compatibility;
export const modelBenchmarkArtifactDisclosure = registry.statusLanguage.modelBenchmarkArtifactDisclosure;

export function evidenceLaneLabel(lane: EvidenceLaneId) {
  return evidenceLanes[lane].publicLabel;
}

export function artifactDisclosureLabel(status: string) {
  return modelBenchmarkArtifactDisclosure[status as ArtifactDisclosureStatus]
    || modelBenchmarkArtifactDisclosure.incomplete;
}
