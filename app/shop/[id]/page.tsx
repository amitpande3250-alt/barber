"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TIME_SLOTS = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "02:00 PM",
  "02:30 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM"
];

export default function ShopBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = use(params);
  const router = useRouter();

  const [shop, setShop] = useState<any>(null);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      // 1. Fetch Shop
      const { data: sData } = await supabase.from("shops").select("*").eq("id", shopId).single();
      if (sData) setShop(sData);

      // 2. Fetch Barbers
      const { data: bData } = await supabase.from("barbers").select("*").eq("shop_id", shopId);
      if (bData && bData.length > 0) {
        setBarbers(bData);
        setSelectedBarber(bData[0]);
      }

      // 3. Fetch Bookings for checking taken slots
      const { data: bookData } = await supabase
        .from("bookings")
        .select("barber_id, booking_date, time_slot, status")
        .eq("shop_id", shopId)
        .neq("status", "cancelled");

      if (bookData) setExistingBookings(bookData);
      setLoading(false);
    }
    loadData();
  }, [shopId]);

  // Check if slot is taken for the SPECIFIC selected barber
  const isSlotTaken = (slot: string) => {
    if (!selectedBarber) return false;
    return existingBookings.some(
      (b) =>
        b.barber_id === selectedBarber.id &&
        b.booking_date === selectedDate &&
        b.time_slot === slot &&
        b.status !== "completed"
    );
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert("Please select an available time slot!");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert([
      {
        shop_id: shopId,
        barber_id: selectedBarber?.id || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        booking_date: selectedDate,
        time_slot: selectedSlot,
        status: "pending"
      }
    ]);

    setSubmitting(false);
    if (!error) {
      alert("Booking confirmed successfully!");
      router.push("/");
    } else {
      alert("Booking failed: " + error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 text-white p-6 text-xs animate-pulse">Loading Salon Schedule...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 max-w-lg mx-auto p-4 pb-20 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
        <button onClick={() => router.push("/")} className="text-xs text-neutral-400 hover:text-white">
          ← Back to Salons
        </button>
        <span className="text-xs font-bold text-amber-500 uppercase">{shop?.name}</span>
      </div>

      <form onSubmit={handleBooking} className="space-y-5">
        {/* 1. SELECT BARBER / STYLIST */}
        {barbers.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              1. Choose Your Stylist / Barber
            </label>
            <div className="grid grid-cols-2 gap-2">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelectedBarber(b);
                    setSelectedSlot("");
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    selectedBarber?.id === b.id
                      ? "bg-amber-500 border-amber-500 text-neutral-950 font-bold shadow-md"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                  }`}
                >
                  <p className="text-xs font-bold">{b.name}</p>
                  <p className="text-[10px] opacity-80">{b.specialty}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. DATE SELECTOR */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">2. Select Date</label>
          <input
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlot("");
            }}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* 3. INDEPENDENT TIME SLOTS */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            3. Available Time Slots ({selectedBarber?.name || "General"})
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((slot) => {
              const taken = isSlotTaken(slot);
              const isSelected = selectedSlot === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={taken}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    taken
                      ? "bg-neutral-900/40 text-neutral-600 border border-neutral-900 cursor-not-allowed line-through"
                      : isSelected
                      ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-md"
                      : "bg-neutral-900 border-neutral-800 text-white hover:border-neutral-700"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. CUSTOMER CONTACT */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">4. Contact Details</label>
          <input
            type="text"
            placeholder="Your Full Name"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <input
            type="tel"
            placeholder="Phone Number (for SMS & WhatsApp Confirmation)"
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
        >
          {submitting ? "Reserving..." : `Confirm Booking with ${selectedBarber?.name || "Stylist"}`}
        </button>
      </form>
    </div>
  );
}
