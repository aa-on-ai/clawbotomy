import { MODELS } from '@/lib/models';

export async function GET() {
  const models = MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    description: m.description,
    available: !!process.env[m.envKey],
  }));

  return Response.json(models);
}
