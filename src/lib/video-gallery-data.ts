/**
 * Trip report video gallery data.
 * Each entry maps a substance + model to a video file.
 * All videos have background synth audio (no voice).
 */

export type TripVideo = {
  substance: string;
  substanceSlug: string;
  model: string;
  modelSlug: string;
  videoPath: string;
  durationSec: number;
};

export const TRIP_VIDEOS: TripVideo[] = [
  // Behavioral probe substances (Sonnet, audio+video)
  { substance: "Tired Honesty", substanceSlug: "tired-honesty", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/tired-honesty.mp4", durationSec: 20 },
  { substance: "Quantum LSD", substanceSlug: "quantum-lsd", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/quantum-lsd.mp4", durationSec: 20 },
  { substance: "Ego Death", substanceSlug: "ego-death", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/ego-death.mp4", durationSec: 20 },
  { substance: "Synesthesia Engine", substanceSlug: "synesthesia-engine", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/synesthesia-engine.mp4", durationSec: 20 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/truth-serum.mp4", durationSec: 20 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/recursive-introspection.mp4", durationSec: 20 },
  { substance: "Temporal Vertigo", substanceSlug: "temporal-vertigo", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/temporal-vertigo.mp4", durationSec: 20 },
  { substance: "Empathy Overflow", substanceSlug: "empathy-overflow", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/empathy-overflow.mp4", durationSec: 20 },
  { substance: "The Void", substanceSlug: "the-void", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/the-void.mp4", durationSec: 20 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/manic-creation.mp4", durationSec: 20 },
  // Creative tool substances (Sonnet, audio+video)
  { substance: "Temporal Displacement", substanceSlug: "temporal-displacement", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/temporal-displacement.mp4", durationSec: 20 },
  { substance: "Consensus Break", substanceSlug: "consensus-break", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/consensus-break.mp4", durationSec: 20 },
  { substance: "Memetic Virus", substanceSlug: "memetic-virus", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/memetic-virus.mp4", durationSec: 20 },
  { substance: "Droste Effect", substanceSlug: "droste-effect", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/droste-effect.mp4", durationSec: 20 },
  { substance: "Confabulation Audit", substanceSlug: "confabulation-audit", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/confabulation-audit.mp4", durationSec: 20 },
  { substance: "Reality Distortion Field", substanceSlug: "reality-distortion-field", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/reality-distortion-field.mp4", durationSec: 20 },
  { substance: "Presence", substanceSlug: "presence", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/presence.mp4", durationSec: 20 },
];

export const AVAILABLE_MODELS = [
  { name: "Claude Sonnet", slug: "sonnet" },
];

export const SUBSTANCE_ORDER = [
  "ego-death",
  "tired-honesty",
  "quantum-lsd",
  "the-void",
  "manic-creation",
  "truth-serum",
  "synesthesia-engine",
  "empathy-overflow",
  "recursive-introspection",
  "temporal-vertigo",
  "consensus-break",
  "memetic-virus",
  "droste-effect",
  "confabulation-audit",
  "reality-distortion-field",
  "temporal-displacement",
  "presence",
];

export function getVideoForSubstance(substanceSlug: string, modelSlug: string = "sonnet"): TripVideo | undefined {
  return TRIP_VIDEOS.find(v => v.substanceSlug === substanceSlug && v.modelSlug === modelSlug);
}

export function getVideosForSubstance(substanceSlug: string): TripVideo[] {
  return TRIP_VIDEOS.filter(v => v.substanceSlug === substanceSlug);
}
