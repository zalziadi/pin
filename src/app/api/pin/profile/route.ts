import { NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/identity";

export async function GET() {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "No Supabase connection" }, { status: 503 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Profile GET error:", err);
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const profile = await updateProfile(data);
    if (!profile) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Profile POST error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
