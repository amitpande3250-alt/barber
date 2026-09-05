"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function OwnerDashboard() {
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [newBarberName, setNewBarberName] = useState("");
  const [activeTab, setActiveTab] = useState<"queue" | "barbers" | "settings">("queue");
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const fetchShopData = useCallback(async (shopId: string) => {
    // 1. Fetch Barbers
    const { data: bData } = await supabase
      .from("barbers")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true });
    if (bData) setBarbers(bData);

    // 2. Fetch Bookings
    const { data: bookData } = await supabase
      .from("bookings")
      .select("*, barbers(name)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (bookData) setBookings(bookData);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const email = user?.email || localStorage.getItem("customer_user_email");
      if (!email) {
        router.push("/");
        return;
      }

      const { data: userShops } = await supabase
        .from("shops")
        .select("*")
        .ilike("owner_email", email.trim().toLowerCase());

      if (userShops && userShops.length > 0) {
        setShops(userShops);
        setSelectedShop(userShops[0]);
        await fetchShopData(userShops[0].id);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [router, fetchShopData]);

  // Barber Actions
  const addBarber = async () => {
    if (!newBarberName.trim() || !selectedShop) return;
    const { data, error } = await supabase
      .from("barbers")
      .insert([{ shop_id: selectedShop.id, name: newBarberName.trim(), specialty: "Senior Stylist" }])
      .select();

    if (!error && data) {
      setBarbers([...barbers, data[0]]);
      setNewBarberName("");
    } else {
      alert("Error adding barber: " + error?.message);
    }
  };

  const deleteBarber = async (id: string) => {
    const { error } = await supabase.from("barbers").delete().eq("id", id);
    if (!error) {
      setBarbers(barbers.filter((b) => b.id !== id));
    }
  };

  // Booking Actions (Mark as Done)
  const markBookingDone = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);

    if (!error) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" } : b))
      );
      alert("Appointment marked as completed! Customer can now leave a review.");
    } else {
      alert("Error updating booking: " + error.message);
    }
  };

  // Category & Status Actions
  const updateShopCategory = async (cat: string) => {
    if (!selectedShop) return;
    const { error } = await supabase.from("shops").update({ category: cat }).eq("id", selectedShop.id);
    if (!error) {
      setSelectedShop({ ...selectedShop, category: cat });
      alert(`Updated category to ${cat.toUpperCase()}!`);
    }
  };

  const toggleShopStatus = async () => {
    if (!selectedShop) return;
    const newStatus = selectedShop.is_open === false ? true : false;
    const { error } = await supabase.from("shops").update({ is_open: newStatus }).eq("id", selectedShop.id);
    if (!error) {
      setSelectedShop({ ...selectedShop, is_open: newStatus });
    }
  };

  const copyShopLink = () => {
    if (!selectedShop) return;
    navigator.clipboard.writeText(`${window.location.origin}/shop/${selectedShop.id}`);
    alert("Booking link copied to clipboard!");
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 text-white p-6 text-xs animate-pulse">Loading Salon Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 max-w-lg mx-auto p-4 pb-20 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
        <div>
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Owner Portal</span>
          <h1 className="text-lg font-black text-white">{selectedShop?.name || "Salon Dashboard"}</h1>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl"
        >
          ← Home
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-900 p-1 rounded-2xl mb-4 border border-neutral-800">
        <button
          onClick={() => setActiveTab("queue")}
          className={`py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "queue" ? "bg-amber-500 text-neutral-950 shadow-md" : "text-neutral-400"
          }`}
        >
          ✂️ Queue ({bookings.filter((b) => b.status !== "completed").length})
        </button>
        <button
          onClick={() => setActiveTab("barbers")}
          className={`py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "barbers" ? "bg-amber-500 text-neutral-950 shadow-md" : "text-neutral-400"
          }`}
        >
          💈 Stylists ({barbers.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "settings" ? "bg-amber-500 text-neutral-950 shadow-md" : "text-neutral-400"
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* 1. QUEUE TAB */}
      {activeTab === "queue" && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-12 bg-neutral-900 rounded-3xl border border-neutral-800 p-6 text-xs text-neutral-500">
              No appointments booked yet.
            </div>
          ) : (
            bookings.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-3xl border transition ${
                  item.status === "completed"
                    ? "bg-neutral-950/40 border-neutral-900 opacity-60"
                    : "bg-neutral-900 border-neutral-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-extrabold uppercase">
                      Stylist: {item.barbers?.name || "General Chair"}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{item.customer_name || "Guest Customer"}</h3>
                    <p className="text-xs text-neutral-400">
                      📅 {item.booking_date} • ⏰ {item.time_slot}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold ${
                      item.status === "completed"
                        ? "bg-neutral-800 text-neutral-400"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {item.status === "completed" ? "Done" : "Confirmed"}
                  </span>
                </div>

                {item.rating && (
                  <div className="mt-2.5 p-2.5 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-xs">
                    <span className="text-amber-400 font-bold">★ {item.rating} / 5</span>
                    {item.review_comment && <p className="text-neutral-300 text-[11px] mt-0.5">&quot;{item.review_comment}&quot;</p>}
                  </div>
                )}

                {item.status !== "completed" && (
                  <button
                    onClick={() => markBookingDone(item.id)}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition"
                  >
                    ✓ Mark Service Completed
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. BARBERS / STYLISTS TAB */}
      {activeTab === "barbers" && (
        <div className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-3">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">+ Add New Stylist / Barber</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={addBarber}
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {barbers.length === 0 ? (
              <p className="text-center py-8 text-neutral-500 text-xs">No barbers added yet. Add one above!</p>
            ) : (
              barbers.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✂️</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{b.name}</h4>
                      <p className="text-[10px] text-neutral-400">Independent Slots Active</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteBarber(b.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white">Share Direct Booking</h3>
              <p className="text-[11px] text-neutral-400">Copy URL for Instagram or WhatsApp</p>
            </div>
            <button
              onClick={copyShopLink}
              className="bg-amber-500 text-neutral-950 font-bold px-3 py-1.5 rounded-xl text-xs"
            >
              🔗 Copy Link
            </button>
          </div>

          {/* Category Switcher */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Salon Category</h3>
            <div className="grid grid-cols-3 gap-2">
              {["men", "women", "unisex"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => updateShopCategory(cat)}
                  className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                    (selectedShop?.category || "unisex") === cat
                      ? "bg-amber-500 text-neutral-950"
                      : "bg-neutral-950 border border-neutral-800 text-neutral-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Status Switcher */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Shop Status</p>
              <p className="text-[11px] text-neutral-400">
                {selectedShop?.is_open !== false ? "🟢 Open for Bookings" : "🔴 Closed Temporarily"}
              </p>
            </div>
            <button
              onClick={toggleShopStatus}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-950 text-white"
            >
              Toggle Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
