export type LiveBenchAccessEnvironment = {
  readonly NODE_ENV?: string;
  readonly CLAWBOTOMY_LIVE_BENCH?: string;
  readonly VERCEL_ENV?: string;
  readonly VERCEL_GIT_COMMIT_REF?: string;
};

const REVIEW_PREVIEW_BRANCH = 'agent/clawbotomy-live-bench';

export function isLiveBenchEnabled(
  environment: LiveBenchAccessEnvironment = process.env,
): boolean {
  if (environment.VERCEL_ENV === 'production') return false;

  if (environment.VERCEL_ENV === 'preview') {
    return environment.VERCEL_GIT_COMMIT_REF === REVIEW_PREVIEW_BRANCH;
  }

  return environment.NODE_ENV !== 'production'
    && environment.CLAWBOTOMY_LIVE_BENCH === '1';
}
