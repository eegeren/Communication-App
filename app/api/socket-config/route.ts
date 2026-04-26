import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Runtime socket URL for the browser (no client rebuild when URL changes).
 * Vercel: set SOCKET_PUBLIC_URL = your Railway https origin (socket-only service).
 * Falls back to NEXT_PUBLIC_SOCKET_SERVER_URL, then localhost for local dev.
 */
export async function GET() {
  const fromServer = process.env.SOCKET_PUBLIC_URL?.trim() || "";
  const fromPublic = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL?.trim() || "";
  const url = fromServer || fromPublic || "http://localhost:3001";
  const path =
    process.env.NEXT_PUBLIC_SOCKET_PATH?.trim() ||
    process.env.SOCKET_PATH?.trim() ||
    "/socket.io";
  const authToken =
    process.env.SOCKET_PUBLIC_AUTH_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_SOCKET_AUTH_TOKEN?.trim() ||
    "";

  return NextResponse.json({
    url,
    path,
    authToken,
  });
}
