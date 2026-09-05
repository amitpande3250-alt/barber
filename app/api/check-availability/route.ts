import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mwlfmnkpgrjbudfdgnmh.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGZtbmtwZ3JqYnVkZmRnbm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTk0NzUsImV4cCI6MjEwMzk5NTQ3NX0.fCRrWYa_BDIbg9C9B9upNFFVZpvJ_v5YcdUaeI2Bf_k"
);

const ALL_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM"
];

export async function POST(req: Request) {
  try {
    const { barberId, date } = await req.json();

    if (!barberId || !date) {
      return NextResponse.json({ error: "Barber and Date required" }, { status: 400 });
    }

    const { data: bookedData, error } = await supabase
      .from("bookings")
      .select("booking_time")
      .eq("barber_id", barberId)
      .eq("booking_date", date)
      .neq("status", "cancelled");

    if (error) {
      console.error("Supabase Query Error:", error);
      // Agar database me abhi table create nahi hui toh saare slots free dikha do
      const slots = ALL_SLOTS.map((time) => ({ time, isFree: true }));
      return NextResponse.json({ slots });
    }

    const bookedTimes = new Set((bookedData || []).map((b) => b.booking_time));

    const slots = ALL_SLOTS.map((time) => ({
      time,
      isFree: !bookedTimes.has(time),
    }));

    return NextResponse.json({ slots });
  } catch (err: any) {
    console.error("API Route Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
