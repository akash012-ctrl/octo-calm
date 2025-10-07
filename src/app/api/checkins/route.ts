import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        { error: "Mood check-ins are no longer available." },
        { status: 410 }
    );
}

export async function GET() {
    return NextResponse.json(
        { error: "Mood check-ins are no longer available." },
        { status: 410 }
    );
}
