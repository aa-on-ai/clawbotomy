import type { Metadata } from 'next';
import { TopicsPage } from '@/components/field-notes/FieldNotes';
export const metadata: Metadata = { title: 'Ideas | Clawbotomy field notes' };
export default function Topics() { return <TopicsPage />; }
