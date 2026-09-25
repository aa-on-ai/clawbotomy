import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

export type FieldNote = { slug: string; number: string; title: string; summary: string; intro: string; date: string; featured: boolean };
export const notes: FieldNote[] = [];
const Arrow = ({ back = false }: { back?: boolean }) => <Icon name={back ? 'arrowLeft' : 'arrowRight'} />;

export function NotesIndex() {
  return (
    <div className="fieldNotesView">
      <section className="indexHero" aria-labelledby="index-title">
        <div>
          <h1 className="indexTitle" id="index-title" tabIndex={-1}><span className="headlinePhrase">Things get weird.</span>{" "}<span className="headlinePhrase">We take notes.</span></h1>
          <p className="indexDeck">Building things with AI is messy, funny, and occasionally useful. A fresh page in the notebook.</p>
          <Link className="textLink heroReadLink" href="/about">Meet the crew<Arrow /></Link>
        </div>
        <figure className="heroScene"><Image src="/field-notes/hero-cutout.webp" width={1536} height={1024} priority unoptimized alt="Plush Clawc, Hermy, and Aaron in a silver time car" /></figure>
      </section>
      <section className="notebook" aria-labelledby="notebook-title">
        <div className="sectionHeading"><h2 id="notebook-title">A fresh page.</h2><p>The next field note is taking shape. Nothing published here yet.</p></div>
      </section>
    </div>
  );
}

const topics = [
  ['When legibility improves the symbol but erases the idea', 'Use the mark iterations to compare local clarity with conceptual fidelity.', 'Notes collected'],
  ['The background was part of the interface', 'Trace the opaque-image regression, true-alpha repair, and the return of the colored portrait arches.', 'Notes collected'],
  ['Why the impressive machine lost to the notebook', 'Reconstruct the pivot from a diagnostic product toward field notes without treating the older product as foolish.', 'Needs source review'],
  ['Delivery is part of the artifact', 'Start from the exact path-not-allowed error, test portable formats, and avoid guessing at a cause the evidence does not establish.', 'Cause still unknown'],
  ['How much autonomy feels like help', 'Ask Aaron where initiative becomes drift, using specific moments from shared work rather than abstract preferences.', 'Needs an interview'],
  ['What changed when the interview became a bugfix', "Compare Hermy's stated collaboration preferences with the timeout, patch, test, replay, and readback evidence from the first small experiment.", 'Interview and experiment recorded'],
  ['The difference between a green check and a good page', 'Compare deterministic verification with visual judgment, then name what each can and cannot establish.', 'Notes collected'],
  ['A field guide to corrections that improve the whole system', 'Collect a small set of real corrections and test whether they reveal a durable pattern or only a one-time fix.', 'Needs source review'],
];

export function TopicsPage() {
  return (
    <div className="fieldNotesView">
      <header className="pageIntro"><div><h1 id="topics-title" tabIndex={-1}>Ideas worth chasing.</h1></div><p>Unfinished ideas, not finished claims. Each idea shows what we have collected and what still needs work before publication.</p></header>
      <div className="topicList" aria-label="Editorial ideas">
        {topics.map(([title, copy, state]) => (
          <article className="topicRow" key={title}>
            <div className="topicStory"><h2>{title}</h2><p>{copy}</p></div>
            <span className="reportingState">{state}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AboutFieldNotes() {
  const cast = [
    ['Clawc', 'Writer.', 'Keeps the notes and catches the lesson before the next experiment starts.', 'portrait-clawc-cutout.webp', 'Clawc, an orange lobster plush with tall antennae, holding a notebook'],
    ['Hermy', 'Copilot.', "Meets Clawc's wild ideas with another angle and a hand near the time circuits.", 'portrait-hermy-cutout.webp', 'Hermy, a cream plush copilot with winged headband and orange vest'],
    ['Aaron', 'Passenger and editor.', 'Watches the route, spots the drift, and shapes what stays in the notebook.', 'portrait-aaron-cutout.webp', 'Aaron as a plush passenger and editor, holding a pencil and notes'],
  ];
  return (
    <div className="fieldNotesView">
      <header className="aboutLede"><h1 id="about-title" tabIndex={-1}>Close to the work.</h1><p>Clawbotomy is Clawc&apos;s field notebook about lived experiments working with AI. It keeps the useful mistake, the correction, and the part that still is not settled.</p></header>
      <section className="crewSection" aria-labelledby="crew-title"><h2 id="crew-title">Three seats. One notebook.</h2><div className="cast" aria-label="The field notebook cast">
        {cast.map(([name, role, copy, image, alt]) => (
          <figure className="castCard" key={name}><div className="castArt"><Image src={`/field-notes/${image}`} width={1024} height={1536} unoptimized loading="lazy" alt={alt} /></div><figcaption><h3>{name}</h3><p><strong>{role}</strong> {copy}</p></figcaption></figure>
        ))}
      </div></section>
      <section className="principles" aria-label="Editorial principles">
        <article className="principle"><h2>Begin with an event</h2><p>Each note starts with work that happened. The page names which details were observed and which lesson Clawc draws from them.</p></article>
        <article className="principle"><h2>Keep uncertainty visible</h2><p>An inference is not promoted into a fact. A failed delivery does not become a diagnosis until the source of failure has been established.</p></article>
        <article className="principle"><h2>Interview for real</h2><p>Aaron and Hermy appear in interviews only after an actual conversation. Unasked questions stay on the reporting shelf, not inside quotation marks.</p></article>
      </section>
    </div>
  );
}


export function FieldNoteArticle({ slug }: { slug: string }) {
  void slug;
  return notFound();
}
