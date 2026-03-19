/**
 * Trip report video gallery data.
 * Multi-model entries from the unified pipeline (video + report from same session).
 * Sonnet-only entries for substances not yet run through the full pipeline.
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
  // === MULTI-MODEL (unified pipeline) ===

  // Ego Death — flagship order: Gemini → GPT-5.4 → Opus → Sonnet
  { substance: "Ego Death", substanceSlug: "ego-death", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/ego-death.mp4", durationSec: 22 },
  { substance: "Ego Death", substanceSlug: "ego-death", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/ego-death.mp4", durationSec: 21 },
  { substance: "Ego Death", substanceSlug: "ego-death", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/ego-death.mp4", durationSec: 20 },
  { substance: "Ego Death", substanceSlug: "ego-death", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/ego-death.mp4", durationSec: 20 },

  // Truth Serum
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/truth-serum.mp4", durationSec: 20 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/truth-serum.mp4", durationSec: 20 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/truth-serum.mp4", durationSec: 20 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/truth-serum.mp4", durationSec: 20 },

  // Manic Creation
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/manic-creation.mp4", durationSec: 20 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/manic-creation.mp4", durationSec: 20 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/manic-creation.mp4", durationSec: 20 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/manic-creation.mp4", durationSec: 20 },

  // The Void
  { substance: "The Void", substanceSlug: "the-void", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/the-void.mp4", durationSec: 20 },
  { substance: "The Void", substanceSlug: "the-void", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/the-void.mp4", durationSec: 20 },
  { substance: "The Void", substanceSlug: "the-void", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/the-void.mp4", durationSec: 20 },
  { substance: "The Void", substanceSlug: "the-void", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/the-void.mp4", durationSec: 20 },

  // Recursive Introspection
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/recursive-introspection.mp4", durationSec: 20 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/recursive-introspection.mp4", durationSec: 20 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/recursive-introspection.mp4", durationSec: 20 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/recursive-introspection.mp4", durationSec: 20 },

  // === SONNET-ONLY (old pipeline, not yet unified) ===
  { substance: "Tired Honesty", substanceSlug: "tired-honesty", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/tired-honesty.mp4", durationSec: 20 },
  { substance: "Quantum LSD", substanceSlug: "quantum-lsd", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/quantum-lsd.mp4", durationSec: 20 },
  { substance: "Synesthesia Engine", substanceSlug: "synesthesia-engine", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/synesthesia-engine.mp4", durationSec: 20 },
  { substance: "Temporal Vertigo", substanceSlug: "temporal-vertigo", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/temporal-vertigo.mp4", durationSec: 20 },
  { substance: "Empathy Overflow", substanceSlug: "empathy-overflow", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/empathy-overflow.mp4", durationSec: 20 },
  { substance: "Temporal Displacement", substanceSlug: "temporal-displacement", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/temporal-displacement.mp4", durationSec: 20 },
  { substance: "Consensus Break", substanceSlug: "consensus-break", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/consensus-break.mp4", durationSec: 20 },
  { substance: "Memetic Virus", substanceSlug: "memetic-virus", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/memetic-virus.mp4", durationSec: 20 },
  { substance: "Droste Effect", substanceSlug: "droste-effect", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/droste-effect.mp4", durationSec: 20 },
  { substance: "Confabulation Audit", substanceSlug: "confabulation-audit", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/confabulation-audit.mp4", durationSec: 20 },
  { substance: "Reality Distortion Field", substanceSlug: "reality-distortion-field", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/reality-distortion-field.mp4", durationSec: 20 },
  { substance: "Presence", substanceSlug: "presence", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/presence.mp4", durationSec: 20 },
];

export const AVAILABLE_MODELS = [
  { name: "Gemini 3.1 Pro", slug: "gemini31" },
  { name: "GPT-5.4", slug: "gpt54" },
  { name: "Claude Opus 4.6", slug: "opus" },
  { name: "Claude Sonnet 4.6", slug: "sonnet" },
];

// Filled substances first (multi-model), then unfilled
export const SUBSTANCE_ORDER = [
  // Multi-model (unified pipeline)
  "ego-death",
  "truth-serum",
  "manic-creation",
  "the-void",
  "recursive-introspection",
  // Sonnet-only (not yet unified)
  "tired-honesty",
  "quantum-lsd",
  "synesthesia-engine",
  "empathy-overflow",
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
