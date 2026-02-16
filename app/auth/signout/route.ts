import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof request.url === 'string' ? new URL(request.url).origin : null) ||
    'http://localhost:3000';
  const res = NextResponse.redirect(new URL('/login', base));
  return res;
}

