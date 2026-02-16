import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './lib/types/database';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2])
          );
        }
      }
    }
  );

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/auth/');
  const isAppRoute = pathname.startsWith('/app');

  if (!session && isAppRoute && !isAuthRoute) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (session && pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/app/:path*', '/login', '/auth/callback']
};
