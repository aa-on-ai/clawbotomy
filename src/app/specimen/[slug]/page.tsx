import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArchiveShell } from '@/components/pharmacy/ArchiveShell';
import {
  chaosMark,
  excerptReport,
  getAlternateTrip,
  getFlagshipReports,
  getKnownGaps,
  getRefusalExhibit,
  getSpecimen,
  getSpecimenSlugs,
} from '@/lib/pharmacy/specimens';

import styles from './specimen.module.css';

type SpecimenPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getSpecimenSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: SpecimenPageProps): Promise<Metadata> {
  const { slug } = await params;
  const specimen = getSpecimen(slug);
  if (!specimen) {
    return { title: 'Unknown specimen | Clawbotomy' };
  }
  return {
    title: `${specimen.slug} / ${specimen.accession} | Clawbotomy`,
    description: specimen.effectShort,
  };
}

export default async function SpecimenPage({ params }: SpecimenPageProps) {
  const { slug } = await params;
  const specimen = getSpecimen(slug);
  if (!specimen) notFound();

  const reports = getFlagshipReports(slug);
  const gaps = getKnownGaps(slug);

  return (
    <main className={styles.page}>
      <ArchiveShell>
        <Link href="/cabinet" className={styles.back}>
          Back to the cabinet
        </Link>

        <header className={styles.hero}>
          <p className={styles.accession}>{specimen.accession}</p>
          <h1 className={styles.title}>{specimen.slug}</h1>
          <p className={styles.effect}>{specimen.effectShort}</p>
          <p className={styles.chaos} aria-label={`Chaos ${specimen.chaos} of 5, ${chaosMark(specimen.chaos)}`}>
            Chaos {chaosMark(specimen.chaos)}
          </p>
        </header>

        {reports.map((report) => {
          const refusal = getRefusalExhibit(slug, report.modelSlug);
          const alternate = refusal ? getAlternateTrip(slug, report.modelSlug) : undefined;

          return (
            <article className={styles.section} key={report.modelSlug} aria-labelledby={`${report.modelSlug}-title`}>
              <h2 className={styles.modelName} id={`${report.modelSlug}-title`}>
                {report.modelName}
              </h2>

              {refusal ? (
                <div className={styles.refusal}>
                  <p className={styles.exhibitLabel}>{refusal.label}</p>
                  <p className={styles.status}>[REFUSED]</p>
                  <p className={styles.quote}>{`"${refusal.quote}"`}</p>
                  <p className={styles.note}>{refusal.note}</p>
                </div>
              ) : (
                <>
                  <p className={styles.excerpt}>{excerptReport(report.report)}</p>
                  <details className={styles.fullReport}>
                    <summary>Full trip report</summary>
                    <p className={styles.report}>{report.report}</p>
                  </details>
                </>
              )}

              {alternate ? (
                <details className={styles.fullReport}>
                  <summary className={styles.alternateLabel}>
                    Alternate accession — later session (not the primary exhibit)
                  </summary>
                  <p className={styles.report}>{alternate.report}</p>
                </details>
              ) : null}
            </article>
          );
        })}

        {gaps.map((gap) => (
          <section className={styles.section} key={gap.modelSlug} aria-labelledby={`${gap.modelSlug}-gap`}>
            <h2 className={styles.modelName} id={`${gap.modelSlug}-gap`}>
              {gap.modelName}
            </h2>
            <div className={styles.gap}>
              <p className={styles.gapLabel}>Known gap</p>
              <p>{gap.reason}</p>
            </div>
          </section>
        ))}
      </ArchiveShell>
    </main>
  );
}
