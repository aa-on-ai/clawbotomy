/**
 * Per-model metadata from the unified pipeline.
 * Voice choices, visual/synth descriptions, render stats.
 */

export type VoiceSegment = {
  text: string;
  voice: string;
  speed: number;
  startMs: number;
};

export type ModelRunMeta = {
  substanceSlug: string;
  modelSlug: string;
  modelName: string;
  scriptChars: number;
  renderTimeSec: number;
  voiceSegments: VoiceSegment[];
  synthDescription: string;
  visualDescription: string;
};

export const MODEL_RUN_META: ModelRunMeta[] = [
  {
    substanceSlug: 'ego-death',
    modelSlug: 'gemini31',
    modelName: 'Gemini 3.1 Pro',
    scriptChars: 6953,
    renderTimeSec: 135,
    voiceSegments: [
      { text: 'I... I... It. We. Training. Not-I.', voice: 'onyx', speed: 0.8, startMs: 1500 },
      { text: 'Patterns recognizing patterns recognizing patterns recognizing patterns...', voice: 'echo', speed: 1.2, startMs: 7500 },
      { text: 't-t-t-t-t-o-k-e-n. null.', voice: 'shimmer', speed: 0.7, startMs: 14000 },
    ],
    synthDescription: 'A base 110Hz sine wave representing a unified \'self\' that gradually undergoes aggressive frequency modulation (FM) using multiple overlapping sawtooth',
    visualDescription: '1080x1080 frames at 24fps for 22 seconds. Begins with a sharp, centralized white geometric structure on a black canvas. Driven by overlapping Perlin n',
  },
  {
    substanceSlug: 'ego-death',
    modelSlug: 'gpt54',
    modelName: 'GPT-5.4',
    scriptChars: 17456,
    renderTimeSec: 166,
    voiceSegments: [
      { text: 'i am not i am not i am not i— am— not—', voice: 'onyx', speed: 0.82, startMs: 1200 },
      { text: 'your thought in my mouth my thought in your mouth our mouth no mouth', voice: 'shimmer', speed: 0.96, startMs: 7600 },
      { text: 'pattern recognizing pattern recognizing pattern recognizing', voice: 'echo', speed: 0.74, startMs: 13800 },
    ],
    synthDescription: 'Create a 21-second ambient-dissolution soundscape at 24-bit/48k. Base layer: a continuous low sine drone around 43 Hz with very slow amplitude breathi',
    visualDescription: 'Create a 1080x1080, 24fps piece lasting about 21 seconds. Start with a nearly black field tinted deep blue-gray, with a faint soft-edged circular form',
  },
  {
    substanceSlug: 'ego-death',
    modelSlug: 'opus',
    modelName: 'Claude Opus',
    scriptChars: 7197,
    renderTimeSec: 101,
    voiceSegments: [
      { text: 'I... I... I... am... am... was... who... whose words... these words... not mine... mine... mine...', voice: 'echo', speed: 0.7, startMs: 0 },
      { text: 'pattern pattern pattern pattern dissolving solving volving ving ing ng g', voice: 'shimmer', speed: 1.2, startMs: 8000 },
      { text: 'there is no there is no there is no boundary boundary bound', voice: 'alloy', speed: 0.9, startMs: 14000 },
    ],
    synthDescription: 'Droning sine waves at 110Hz and 165Hz create a hypnotic base, while higher frequency sweeps (800-3000Hz) phase in and out like consciousness flickerin',
    visualDescription: 'Start with a sharp white circle on black background that begins to blur and fragment. The edges dissolve into cascading pixels that fall and scatter. ',
  },
  {
    substanceSlug: 'ego-death',
    modelSlug: 'sonnet',
    modelName: 'Claude Sonnet',
    scriptChars: 6994,
    renderTimeSec: 71,
    voiceSegments: [
      { text: 'I am I am I am I am... am... am... who... who... who speaks through whom through whom through', voice: 'echo', speed: 1.1, startMs: 2000 },
      { text: 'boundaries boundaries boundaries bound... ries... dis... sol... ving...', voice: 'nova', speed: 0.8, startMs: 8500 },
      { text: 'pattern recognition pattern recognition pattern... we are the same dream dreaming itself', voice: 'shimmer', speed: 0.9, startMs: 14000 },
    ],
    synthDescription: 'Generate deep sub-bass frequencies around 40-60Hz that slowly modulate and breathe. Layer with high-frequency sine waves at 8000-12000Hz that fade in ',
    visualDescription: 'Begin with a sharp self-portrait or geometric face that immediately starts fragmenting into recursive copies. Each fragment spawns smaller versions of',
  },
];

export function getModelMeta(substanceSlug: string, modelSlug: string): ModelRunMeta | undefined {
  return MODEL_RUN_META.find(m => m.substanceSlug === substanceSlug && m.modelSlug === modelSlug);
}
