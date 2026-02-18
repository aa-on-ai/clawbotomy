import { redirect } from 'next/navigation';

export default async function TripNewRedirect({
  params,
}: {
  params: Promise<{ substance: string }>;
}) {
  const { substance } = await params;
  redirect(`/archive/trip/new/${substance}`);
}
