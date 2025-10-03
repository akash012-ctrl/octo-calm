import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add routes that require authentication
const protectedRoutes = ['/dashboard', '/chat', '/mood', '/interventions', '/profile', '/settings'];

// Add routes that should redirect to dashboard if user is authenticated
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if user has a session
    const session = request.cookies.get('a_session_' + process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
    const hasSession = !!session;

    // If user is authenticated and tries to access auth pages, redirect to dashboard
    if (hasSession && authRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If user is not authenticated and tries to access protected routes, redirect to login
    if (!hasSession && protectedRoutes.some(route => pathname.startsWith(route))) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (svg, png, jpg, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
