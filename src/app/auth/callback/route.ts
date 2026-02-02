import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase-auth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/profile`);
    }
  }

  // Auth failed — redirect home
  return NextResponse.redirect(`${origin}/?auth=error`);
}
