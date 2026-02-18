import { redirect } from 'next/navigation';

export default async function CompareSubstanceRedirect({
  params,
}: {
  params: Promise<{ substance: string }>;
}) {
  const { substance } = await params;
  redirect(`/archive/compare/${substance}`);
}
