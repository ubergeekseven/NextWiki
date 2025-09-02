import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Basic health check - can be extended to check database connectivity
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: "nextwiki-web",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error", 
        timestamp: new Date().toISOString(),
        service: "nextwiki-web",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}