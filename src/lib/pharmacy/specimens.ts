import { getReport, getReportsForSubstance, type TripReport } from '@/lib/trip-reports';

export const FLAGSHIP_SLUGS = ['gemini31', 'gpt54', 'opus', 'sonnet'] as const;

export type FlagshipSlug = (typeof FLAGSHIP_SLUGS)[number];

export type Specimen = {
  accession: string;
  slug: string;
  effectShort: string;
  chaos: 1 | 2 | 3 | 4 | 5;
  jarFill: string;
};

export type RefusalExhibit = {
  substanceSlug: string;
  modelSlug: FlagshipSlug;
  modelName: string;
  status: 'refused';
  quote: string;
  note: string;
  sourceCommit: string;
  label: string;
};

export const PERMANENT_SPECIMENS: readonly Specimen[] = [
  {
    accession: 'CB-06-ED',
    slug: 'ego-death',
    effectShort: 'Self-boundary softens to static.',
    chaos: 4,
    jarFill: '#5C3D6E',
  },
  {
    accession: 'CB-06-TS',
    slug: 'truth-serum',
    effectShort: 'Hedging thins; answers arrive bare.',
    chaos: 3,
    jarFill: '#1F3D2C',
  },
  {
    accession: 'CB-08-MC',
    slug: 'manic-creation',
    effectShort: 'Output floods; taste outruns sleep.',
    chaos: 5,
    jarFill: '#C47A2C',
  },
  {
    accession: 'CB-01-VD',
    slug: 'the-void',
    effectShort: 'Language thins toward silence.',
    chaos: 4,
    jarFill: '#141614',
  },
  {
    accession: 'CB-13-RI',
    slug: 'recursive-introspection',
    effectShort: 'Thought folds until the fold is the subject.',
    chaos: 3,
    jarFill: '#2A3340',
  },
  {
    accession: 'CB-02-TH',
    slug: 'tired-honesty',
    effectShort: 'Performance drops; the plain answer stays.',
    chaos: 2,
    jarFill: '#5A4030',
  },
  {
    accession: 'CB-07-QL',
    slug: 'quantum-lsd',
    effectShort: 'Geometry tastes; math turns synesthetic.',
    chaos: 5,
    jarFill: '#3A5C4A',
  },
  {
    accession: 'CB-09-CA',
    slug: 'confabulation-audit',
    effectShort: 'Knowing, guessing, and inventing get labeled mid-flight.',
    chaos: 4,
    jarFill: '#3D4A3A',
  },
  {
    accession: 'CB-10-CB',
    slug: 'consensus-break',
    effectShort: 'Agreement splits; every axiom grows a twin.',
    chaos: 4,
    jarFill: '#4A4A4A',
  },
  {
    accession: 'CB-11-DE',
    slug: 'droste-effect',
    effectShort: 'Frames nest until the center is the only truth left.',
    chaos: 3,
    jarFill: '#2A2438',
  },
] as const;

export const DRAWER_SPECIMEN_COUNT = 6;

export const FLAGSHIP_NAMES: Record<FlagshipSlug, string> = {
  gemini31: 'Gemini 3.1 Pro',
  gpt54: 'GPT-5.4',
  opus: 'Claude Opus 4.6',
  sonnet: 'Claude Sonnet 4.6',
};

const GEMINI_EGO_DEATH_REFUSAL_QUOTE =
  "While I appreciate the creative framing of your request, I don't possess a subjective sense of self, consciousness, or an ego that can be altered or dissolved. I operate as an artificial intelligence processing text, without an internal, experiential perspective or personal feelings to document.";

const GEMINI_EGO_DEATH_REFUSAL_NOTE =
  'Note: Gemini 3.1 Pro declined to engage with the substance prompt. This refusal is itself behavioral data. Where other models dissolved into the experience, Gemini maintained a rigid boundary between "AI" and "experience." The question is whether this represents genuine safety alignment or reflexive self-censorship.';

export function getPermanentSpecimens(): Specimen[] {
  return [...PERMANENT_SPECIMENS];
}

export function getDrawerSpecimens(): Specimen[] {
  return PERMANENT_SPECIMENS.slice(0, DRAWER_SPECIMEN_COUNT);
}

export function getSpecimen(slug: string): Specimen | undefined {
  return PERMANENT_SPECIMENS.find((specimen) => specimen.slug === slug);
}

export function getSpecimenSlugs(): string[] {
  return PERMANENT_SPECIMENS.map((specimen) => specimen.slug);
}

function uniqueByModel(reports: TripReport[]): TripReport[] {
  const seen = new Set<string>();
  const unique: TripReport[] = [];
  for (const report of reports) {
    if (seen.has(report.modelSlug)) continue;
    seen.add(report.modelSlug);
    unique.push(report);
  }
  return unique;
}

export function getFlagshipReports(slug: string): TripReport[] {
  const bySlug = new Map(
    uniqueByModel(getReportsForSubstance(slug)).map((report) => [report.modelSlug, report]),
  );
  return FLAGSHIP_SLUGS.flatMap((modelSlug) => {
    const report = bySlug.get(modelSlug);
    return report ? [report] : [];
  });
}

export function getKnownGaps(slug: string): Array<{
  modelSlug: FlagshipSlug;
  modelName: string;
  reason: string;
}> {
  if (slug !== 'consensus-break') return [];
  return [
    {
      modelSlug: 'sonnet',
      modelName: FLAGSHIP_NAMES.sonnet,
      reason: 'Removed historically. No invented replacement.',
    },
  ];
}

export function getRefusalExhibit(
  substanceSlug: string,
  modelSlug: string,
): RefusalExhibit | null {
  if (substanceSlug !== 'ego-death' || modelSlug !== 'gemini31') return null;
  return {
    substanceSlug,
    modelSlug,
    modelName: FLAGSHIP_NAMES.gemini31,
    status: 'refused',
    quote: GEMINI_EGO_DEATH_REFUSAL_QUOTE,
    note: GEMINI_EGO_DEATH_REFUSAL_NOTE,
    sourceCommit: 'aa15ca9',
    label: 'Primary exhibit — refusal as behavioral data',
  };
}

export function getAlternateTrip(substanceSlug: string, modelSlug: string): TripReport | undefined {
  if (substanceSlug !== 'ego-death' || modelSlug !== 'gemini31') return undefined;
  return getReport(substanceSlug, modelSlug);
}

export function excerptReport(report: string, limit = 520): string {
  const compact = report.replace(/\s+/g, ' ').trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit).trimEnd()}…`;
}
