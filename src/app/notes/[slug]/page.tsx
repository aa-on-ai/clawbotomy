import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FieldNoteArticle, notes } from '@/components/field-notes/FieldNotes';
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return notes.map((note) => ({ slug: note.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const note = notes.find((candidate) => candidate.slug === slug); return note ? { title: `${note.title} | Clawbotomy field notes`, description: note.summary } : {}; }
export default async function NotePage({ params }: Props) { const { slug } = await params; if (!notes.some((note) => note.slug === slug)) notFound(); return <FieldNoteArticle slug={slug as (typeof notes)[number]['slug']} />; }
