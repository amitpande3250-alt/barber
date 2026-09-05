import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mwlfmnkpgrjbudfdgnmh.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGZtbmtwZ3JqYnVkZmRnbm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTk0NzUsImV4cCI6MjEwMzk5NTQ3NX0.fCRrWYa_BDIbg9C9B9upNFFVZpvJ_v5YcdUaeI2Bf_k"
);

export async function POST(req: Request) {
  try {
    const { barberId, bookingDate, shopName } = await req.json();

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return NextResponse.json(
        { error: "WhatsApp credentials not configured in .env.local" },
        { status: 500 }
      );
    }

    // 1. Fetch next waiting customer for this barber
    const { data: upcomingBookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("barber_id", barberId)
      .eq("booking_date", bookingDate)
      .eq("status", "confirmed")
      .eq("whatsapp_notified", false)
      .order("booking_time", { ascending: true })
      .limit(1);

    if (error) throw error;

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return NextResponse.json({ message: "No upcoming customer in line right now." });
    }

    const nextCustomer = upcomingBookings[0];
    let cleanPhone = nextCustomer.customer_phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    const messageText = `Hello ${nextCustomer.customer_name}! 👋\n\nYour barber at ${
      shopName || "the salon"
    } is finishing up with the current customer.\n\nYou are NEXT in line for your appointment at ${
      nextCustomer.booking_time
    }. Please head to the salon shortly! 💈`;

    // 2. Send via Meta WhatsApp Cloud API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: { preview_url: false, body: messageText },
        }),
      }
    );

    const metaData = await metaResponse.json();

    if (metaData.error) {
      console.error("Meta API Error:", metaData.error);
      return NextResponse.json({ error: metaData.error.message }, { status: 400 });
    }

    // 3. Mark as notified in Database
    await supabase
      .from("bookings")
      .update({ whatsapp_notified: true })
      .eq("id", nextCustomer.id);

    return NextResponse.json({
      success: true,
      notifiedCustomer: {
        id: nextCustomer.id,
        name: nextCustomer.customer_name,
        phone: cleanPhone,
        time: nextCustomer.booking_time,
      },
    });
  } catch (err: any) {
    console.error("Error dispatching WhatsApp:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
