import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);

	if (!sessionCookie) {
		 const path = request.nextUrl.pathname
		  const redirectUrl = new URL("/sign-in", request.url)
      redirectUrl.searchParams.set("redirect", path + request.nextUrl.search)
      return NextResponse.redirect(redirectUrl)
	}

	return NextResponse.next();
}

export const config = {
	// runtime: "nodejs",
	matcher: ["/book" , "/dashboard/:path*", "/admin/:path*"],
};