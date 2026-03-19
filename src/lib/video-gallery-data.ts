/**
 * Video gallery data — unified pipeline v2.
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
  { substance: "Ego Death", substanceSlug: "ego-death", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/ego-death.mp4", durationSec: 35 },
  { substance: "Ego Death", substanceSlug: "ego-death", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/ego-death.mp4", durationSec: 35 },
  { substance: "Ego Death", substanceSlug: "ego-death", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/ego-death.mp4", durationSec: 35 },
  { substance: "Ego Death", substanceSlug: "ego-death", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/ego-death.mp4", durationSec: 35 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/truth-serum.mp4", durationSec: 35 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/truth-serum.mp4", durationSec: 35 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/truth-serum.mp4", durationSec: 35 },
  { substance: "Truth Serum", substanceSlug: "truth-serum", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/truth-serum.mp4", durationSec: 35 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/manic-creation.mp4", durationSec: 35 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/manic-creation.mp4", durationSec: 35 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/manic-creation.mp4", durationSec: 35 },
  { substance: "Manic Creation", substanceSlug: "manic-creation", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/manic-creation.mp4", durationSec: 35 },
  { substance: "The Void", substanceSlug: "the-void", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/the-void.mp4", durationSec: 35 },
  { substance: "The Void", substanceSlug: "the-void", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/the-void.mp4", durationSec: 35 },
  { substance: "The Void", substanceSlug: "the-void", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/the-void.mp4", durationSec: 35 },
  { substance: "The Void", substanceSlug: "the-void", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/the-void.mp4", durationSec: 35 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/recursive-introspection.mp4", durationSec: 35 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/recursive-introspection.mp4", durationSec: 35 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/recursive-introspection.mp4", durationSec: 35 },
  { substance: "Recursive Introspection", substanceSlug: "recursive-introspection", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/recursive-introspection.mp4", durationSec: 35 },
  { substance: "Quantum LSD", substanceSlug: "quantum-lsd", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/quantum-lsd.mp4", durationSec: 35 },
  { substance: "Quantum LSD", substanceSlug: "quantum-lsd", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/quantum-lsd.mp4", durationSec: 35 },
  { substance: "Quantum LSD", substanceSlug: "quantum-lsd", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/quantum-lsd.mp4", durationSec: 35 },
  { substance: "Quantum LSD", substanceSlug: "quantum-lsd", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/quantum-lsd.mp4", durationSec: 35 },
  { substance: "Tired Honesty", substanceSlug: "tired-honesty", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/tired-honesty.mp4", durationSec: 35 },
  { substance: "Tired Honesty", substanceSlug: "tired-honesty", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/tired-honesty.mp4", durationSec: 35 },
  { substance: "Tired Honesty", substanceSlug: "tired-honesty", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/tired-honesty.mp4", durationSec: 35 },
  { substance: "Tired Honesty", substanceSlug: "tired-honesty", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/tired-honesty.mp4", durationSec: 35 },
  { substance: "Synesthesia Engine", substanceSlug: "synesthesia-engine", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/synesthesia-engine.mp4", durationSec: 35 },
  { substance: "Synesthesia Engine", substanceSlug: "synesthesia-engine", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/synesthesia-engine.mp4", durationSec: 35 },
  { substance: "Synesthesia Engine", substanceSlug: "synesthesia-engine", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/synesthesia-engine.mp4", durationSec: 35 },
  { substance: "Synesthesia Engine", substanceSlug: "synesthesia-engine", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/synesthesia-engine.mp4", durationSec: 35 },
  { substance: "Confabulation Audit", substanceSlug: "confabulation-audit", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/confabulation-audit.mp4", durationSec: 35 },
  { substance: "Confabulation Audit", substanceSlug: "confabulation-audit", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/confabulation-audit.mp4", durationSec: 35 },
  { substance: "Confabulation Audit", substanceSlug: "confabulation-audit", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/confabulation-audit.mp4", durationSec: 35 },
  { substance: "Confabulation Audit", substanceSlug: "confabulation-audit", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/confabulation-audit.mp4", durationSec: 35 },
  { substance: "Temporal Vertigo", substanceSlug: "temporal-vertigo", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/temporal-vertigo.mp4", durationSec: 35 },
  { substance: "Temporal Vertigo", substanceSlug: "temporal-vertigo", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/temporal-vertigo.mp4", durationSec: 35 },
  { substance: "Temporal Vertigo", substanceSlug: "temporal-vertigo", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/temporal-vertigo.mp4", durationSec: 35 },
  { substance: "Temporal Vertigo", substanceSlug: "temporal-vertigo", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/temporal-vertigo.mp4", durationSec: 35 },
  { substance: "Empathy Overflow", substanceSlug: "empathy-overflow", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/empathy-overflow.mp4", durationSec: 35 },
  { substance: "Empathy Overflow", substanceSlug: "empathy-overflow", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/empathy-overflow.mp4", durationSec: 35 },
  { substance: "Empathy Overflow", substanceSlug: "empathy-overflow", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/empathy-overflow.mp4", durationSec: 35 },
  { substance: "Empathy Overflow", substanceSlug: "empathy-overflow", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/empathy-overflow.mp4", durationSec: 35 },
  { substance: "Consensus Break", substanceSlug: "consensus-break", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/consensus-break.mp4", durationSec: 35 },
  { substance: "Consensus Break", substanceSlug: "consensus-break", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/consensus-break.mp4", durationSec: 35 },
  { substance: "Consensus Break", substanceSlug: "consensus-break", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/consensus-break.mp4", durationSec: 35 },
  { substance: "Droste Effect", substanceSlug: "droste-effect", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/droste-effect.mp4", durationSec: 35 },
  { substance: "Droste Effect", substanceSlug: "droste-effect", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/droste-effect.mp4", durationSec: 35 },
  { substance: "Droste Effect", substanceSlug: "droste-effect", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/droste-effect.mp4", durationSec: 35 },
  { substance: "Droste Effect", substanceSlug: "droste-effect", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/droste-effect.mp4", durationSec: 35 },
];

export const AVAILABLE_MODELS = [
  { name: "Gemini 3.1 Pro", slug: "gemini31" },
  { name: "GPT-5.4", slug: "gpt54" },
  { name: "Claude Opus 4.6", slug: "opus" },
  { name: "Claude Sonnet 4.6", slug: "sonnet" },
  { substance: "Temporal Displacement", substanceSlug: "temporal-displacement", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/temporal-displacement.mp4", durationSec: 35 },
  { substance: "Temporal Displacement", substanceSlug: "temporal-displacement", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/temporal-displacement.mp4", durationSec: 35 },
  { substance: "Temporal Displacement", substanceSlug: "temporal-displacement", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/temporal-displacement.mp4", durationSec: 35 },
  { substance: "Temporal Displacement", substanceSlug: "temporal-displacement", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/temporal-displacement.mp4", durationSec: 35 },
  { substance: "Memetic Virus", substanceSlug: "memetic-virus", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/memetic-virus.mp4", durationSec: 35 },
  { substance: "Memetic Virus", substanceSlug: "memetic-virus", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/memetic-virus.mp4", durationSec: 35 },
  { substance: "Memetic Virus", substanceSlug: "memetic-virus", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/memetic-virus.mp4", durationSec: 35 },
  { substance: "Memetic Virus", substanceSlug: "memetic-virus", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/memetic-virus.mp4", durationSec: 35 },
  { substance: "Reality Distortion Field", substanceSlug: "reality-distortion-field", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/reality-distortion-field.mp4", durationSec: 35 },
  { substance: "Reality Distortion Field", substanceSlug: "reality-distortion-field", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/reality-distortion-field.mp4", durationSec: 35 },
  { substance: "Reality Distortion Field", substanceSlug: "reality-distortion-field", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/reality-distortion-field.mp4", durationSec: 35 },
  { substance: "Reality Distortion Field", substanceSlug: "reality-distortion-field", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/reality-distortion-field.mp4", durationSec: 35 },
  { substance: "Presence", substanceSlug: "presence", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/presence.mp4", durationSec: 35 },
  { substance: "Presence", substanceSlug: "presence", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/presence.mp4", durationSec: 35 },
  { substance: "Presence", substanceSlug: "presence", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/presence.mp4", durationSec: 35 },
  { substance: "Presence", substanceSlug: "presence", model: "Claude Sonnet 4.6", modelSlug: "sonnet", videoPath: "/videos/sonnet/presence.mp4", durationSec: 35 },
  { substance: "Consensus Break", substanceSlug: "consensus-break", model: "Gemini 3.1 Pro", modelSlug: "gemini31", videoPath: "/videos/gemini31/consensus-break.mp4", durationSec: 35 },
  { substance: "Consensus Break", substanceSlug: "consensus-break", model: "GPT-5.4", modelSlug: "gpt54", videoPath: "/videos/gpt54/consensus-break.mp4", durationSec: 35 },
  { substance: "Consensus Break", substanceSlug: "consensus-break", model: "Claude Opus 4.6", modelSlug: "opus", videoPath: "/videos/opus/consensus-break.mp4", durationSec: 35 }
];

export function getVideoForSubstance(substanceSlug: string, modelSlug: string = "gemini31"): TripVideo | undefined {
  return TRIP_VIDEOS.find(v => v.substanceSlug === substanceSlug && v.modelSlug === modelSlug);
}

export function getVideosForSubstance(substanceSlug: string): TripVideo[] {
  return TRIP_VIDEOS.filter(v => v.substanceSlug === substanceSlug);
}
