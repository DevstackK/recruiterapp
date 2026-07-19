import { NextResponse, type NextRequest } from "next/server";
import { saveCredentialsFromCode } from "@/lib/gmail/client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/settings/gmail?error=${encodeURIComponent(oauthError)}`, request.url),
    );
  }
  if (!code) {
    return NextResponse.redirect(
      new URL(`/settings/gmail?error=${encodeURIComponent("Missing authorization code")}`, request.url),
    );
  }

  try {
    await saveCredentialsFromCode(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to connect Gmail";
    return NextResponse.redirect(new URL(`/settings/gmail?error=${encodeURIComponent(message)}`, request.url));
  }

  return NextResponse.redirect(new URL("/settings/gmail?connected=1", request.url));
}
