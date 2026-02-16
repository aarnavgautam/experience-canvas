import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  const res = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
  return res;
}

