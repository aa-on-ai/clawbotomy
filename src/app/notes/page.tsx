import type { Metadata } from 'next';
import { NotesIndex } from '@/components/field-notes/FieldNotes';
export const metadata: Metadata = { title: 'Notes | Clawbotomy field notes' };
export default function NotesPage() { return <NotesIndex />; }
