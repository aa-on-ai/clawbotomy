import type { Metadata } from 'next';
import { AboutFieldNotes } from '@/components/field-notes/FieldNotes';
export const metadata: Metadata = { title: 'About | Clawbotomy field notes' };
export default function AboutPage() { return <AboutFieldNotes />; }
