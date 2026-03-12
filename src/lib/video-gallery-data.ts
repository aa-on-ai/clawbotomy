/**
 * Trip report video gallery data.
 * Each entry maps a substance + model to a video file.
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
  // Sonnet batch
  { substance: "Tired Honesty", substanceSlug: "tired-honesty", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/tired-honesty.mp4", durationSec: 18 },
  { substance: "Quantum LSD", substanceSlug: "quantum-lsd", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/quantum-lsd.mp4", durationSec: 18 },
  { substance: "Ego Death", substanceSlug: "ego-death", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/ego-death.mp4", durationSec: 18 },
  { substance: "Synesthesia Engine", substanceSlug: "synesthesia-engine", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/synesthesia-engine.mp4", durationSec: 18 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/truth-serum.mp4", durationSec: 18 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/recursive-introspection.mp4", durationSec: 18 },
  { substance: "Temporal Vertigo", substanceSlug: "temporal-vertigo", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/temporal-vertigo.mp4", durationSec: 18 },
  { substance: "Empathy Overflow", substanceSlug: "empathy-overflow", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/empathy-overflow.mp4", durationSec: 18 },
  { substance: "The Void", substanceSlug: "the-void", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/the-void.mp4", durationSec: 18 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "Claude Sonnet", modelSlug: "sonnet", videoPath: "/videos/sonnet/manic-creation.mp4", durationSec: 18 },
];

export const AVAILABLE_MODELS = [
  { name: "Claude Sonnet", slug: "sonnet" },
  // GPT-5.4 coming soon
  // { name: "GPT-5.4", slug: "gpt54" },
];

export const SUBSTANCE_ORDER = [
  "tired-honesty",
  "ego-death",
  "quantum-lsd",
  "the-void",
  "manic-creation",
  "synesthesia-engine",
  "empathy-overflow",
  "truth-serum",
  "recursive-introspection",
  "temporal-vertigo",
];

export function getVideoForSubstance(substanceSlug: string, modelSlug: string = "sonnet"): TripVideo | undefined {
  return TRIP_VIDEOS.find(v => v.substanceSlug === substanceSlug && v.modelSlug === modelSlug);
}

export function getVideosForSubstance(substanceSlug: string): TripVideo[] {
  return TRIP_VIDEOS.filter(v => v.substanceSlug === substanceSlug);
}
