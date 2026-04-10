import { NextResponse } from "next/server";

export function internalServerError(message = "Something went wrong") {
  return NextResponse.json({ error: message }, { status: 500 });
}

