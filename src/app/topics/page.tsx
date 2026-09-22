import type { Metadata } from 'next';
import { TopicsPage } from '@/components/field-notes/FieldNotes';
export const metadata: Metadata = { title: 'Topics | Clawbotomy field notes' };
export default function Topics() { return <TopicsPage />; }
