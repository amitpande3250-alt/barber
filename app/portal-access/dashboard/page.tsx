"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function BarberOwnerPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"bookings" | "services" | "settings">("bookings");

  const [myShops, setMyShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // New service modal state
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState<number>(100);
  const [newServiceCategory, setNewServiceCategory] = useState("Hair");
  const [newServiceDuration, setNewServiceDuration] = useState("30 min");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const initOwnerData = async (email: string | null) => {
      if (!email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      // Fetch all shops belonging to this owner
      const { data: shopsData } = await supabase
        .from("shops")
        .select("*")
        .ilike("owner_email", email.trim())
        .order("created_at", { ascending: false });

      if (shopsData && shopsData.length > 0) {
        setMyShops(shopsData);
        const current = shopsData[0];
        setSelectedShop(current);
        loadShopData(current.id);
      } else {
        setMyShops([]);
        setSelectedShop(null);
      }
      setLoading(false);
    };

    const savedEmail = localStorage.getItem("customer_user_email");
    if (savedEmail) initOwnerData(savedEmail);

    try {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user?.email) initOwnerData(user.email);
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  const loadShopData = async (shopId: string) => {
    const { data: srvData } = await supabase
      .from("shop_services")
      .select("*")
      .eq("shop_id", shopId)
      .order("name");
    if (srvData) setServices(srvData);

    const { data: bData } = await supabase
      .from("bookings")
      .select("*, barbers(name)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (bData) setBookings(bData);
  };

  const handleShopSwitch = (shopId: string) => {
    const found = myShops.find((s) => s.id === shopId);
    if (found) {
      setSelectedShop(found);
      loadShopData(found.id);
    }
  };

  // Toggle Shop Open / Closed Status
  const toggleShopStatus = async () => {
    if (!selectedShop) return;
    const updatedStatus = selectedShop.is_open === false ? true : false;

    const { error } = await supabase
      .from("shops")
      .update({ is_open: updatedStatus })
      .eq("id", selectedShop.id);

    if (!error) {
      setSelectedShop({ ...selectedShop, is_open: updatedStatus });
      setMyShops(
        myShops.map((s) => (s.id === selectedShop.id ? { ...s, is_open: updatedStatus } : s))
      );
    }
  };

  // Permanently Delete Shop
  const deleteCurrentShop = async () => {
    if (!selectedShop) return;

    const confirmDelete = window.confirm(
      `Kya aap sach me "${selectedShop.name}" ko permanently band/delete karna chahte hain? Iska data wapas nahi aayega.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("shops").delete().eq("id", selectedShop.id);

    if (!error) {
      alert("Shop successfully delete ho gayi hai.");
      localStorage.removeItem("my_owned_shop_id");

      const remaining = myShops.filter((s) => s.id !== selectedShop.id);
      setMyShops(remaining);

      if (remaining.length > 0) {
        setSelectedShop(remaining[0]);
        loadShopData(remaining[0].id);
      } else {
        setSelectedShop(null);
        router.push("/");
      }
    } else {
      alert("Delete failed: " + error.message);
    }
  };

  const savePrice = async (id: string) => {
    await supabase
      .from("shop_services")
      .update({ price_num: editPrice, price: `₹${editPrice}` })
      .eq("id", id);
    setEditingId(null);
    if (selectedShop) loadShopData(selectedShop.id);
  };

  const addNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !selectedShop) return;

    await supabase.from("shop_services").insert({
      shop_id: selectedShop.id,
      name: newServiceName,
      category: newServiceCategory,
      price: `₹${newServicePrice}`,
      price_num: Number(newServicePrice),
      duration: newServiceDuration,
    });

    setNewServiceName("");
    setShowAddModal(false);
    loadShopData(selectedShop.id);
  };

  const sendWhatsAppNotification = (booking: any) => {
    const cleanPhone = booking.customer_phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = `Hello ${booking.customer_name}! 👋\nYour barber (${booking.barbers?.name || "Stylist"}) at ${
      selectedShop?.name || "the salon"
    } is ready for you.\n\nYou are NEXT in queue for your appointment at ${
      booking.booking_time
    }. Please arrive shortly! 💈`;

    const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waLink, "_blank");

    supabase
      .from("bookings")
      .update({ whatsapp_notified: true })
      .eq("id", booking.id)
      .then(() => {
        if (selectedShop) loadShopData(selectedShop.id);
      });
  };

  const markComplete = async (id: string) => {
    await supabase.from("bookings").update({ status: "completed" }).eq("id", id);
    if (selectedShop) loadShopData(selectedShop.id);
  };

  if (!loading && myShops.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 max-w-lg mx-auto flex flex-col items-center justify-center text-center space-y-4 font-sans">
        <span className="text-4xl">💈</span>
        <h1 className="text-lg font-bold text-white">Aapki koi active dukaan nahi hai</h1>
        <p className="text-xs text-neutral-400">
          Aapne apni sabhi test dukanen delete kar di hain ya abhi tak nayi dukan register nahi ki hai.
        </p>
        <button
          onClick={() => router.push("/register-shop")}
          className="bg-amber-500 text-neutral-950 font-bold px-4 py-2.5 rounded-xl text-xs"
        >
          + Add New Shop
        </button>
      </div>
    );
  }
  // --- NAYE FUNCTIONS YAHAN SE HAIN ---
  const updateShopCategory = async (newCat: string) => {
    if (!selectedShop) return;
    const { error } = await supabase
      .from("shops")
      .update({ category: newCat })
      .eq("id", selectedShop.id);

    if (!error) {
      setSelectedShop({ ...selectedShop, category: newCat });
      alert(`Shop category updated to ${newCat.toUpperCase()}!`);
    } else {
      alert("Error updating category: " + error.message);
    }
  };

  const copyShopLink = () => {
    if (!selectedShop) return;
    const url = `${window.location.origin}/shop/${selectedShop.id}`;
    navigator.clipboard.writeText(url);
    alert("Booking link copied! Paste it on WhatsApp or Instagram Bio.");
  };
  // ------------------------------------

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 max-w-lg mx-auto pb-16 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-neutral-900 mb-4">
        <div>
          <button
            onClick={() => router.push("/")}
            className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block hover:underline"
          >
            ← Back to Marketplace
          </button>
          <h1 className="text-lg font-black text-white">{selectedShop?.name || "My Dashboard"}</h1>
        </div>

        {/* Shop Switcher (if user created multiple shops) */}
        {myShops.length > 1 && (
          <select
            value={selectedShop?.id}
            onChange={(e) => handleShopSwitch(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded-xl focus:outline-none"
          >
            {myShops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-3 gap-1.5 bg-neutral-900/90 p-1.5 rounded-2xl border border-neutral-800 mb-5 text-center">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "bookings"
              ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          ✂️ Queue ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "services"
              ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          💰 Rates ({services.length})
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "settings"
              ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          ⚙️ Shop Status
        </button>
      </div>

      {/* TAB 1: QUEUE & BOOKINGS */}
      {activeTab === "bookings" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Today&apos;s Appointments
            </h2>
          </div>

          {loading ? (
            <p className="text-xs text-neutral-500 text-center py-8">Loading queue...</p>
          ) : bookings.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-2">
              <span className="text-3xl">☕</span>
              <p className="text-xs font-semibold text-neutral-300">No appointments right now</p>
              <p className="text-[11px] text-neutral-500">
                Bookings will appear here when customers select this shop.
              </p>
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        {b.booking_time}
                      </span>
                      <span className="text-sm font-bold text-white">{b.customer_name}</span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1.5">
                      Services: <span className="text-amber-300 font-medium">{b.service_name}</span>
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Barber: {b.barbers?.name || "Stylist"} • 📞 {b.customer_phone}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400 block">
                      ₹{b.total_price || 150}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">
                      {b.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 gap-2">
                  <button
                    onClick={() => sendWhatsAppNotification(b)}
                    className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <span>💬</span> WhatsApp Alert
                  </button>

                  {b.status === "confirmed" ? (
                    <button
                      onClick={() => markComplete(b.id)}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-4 py-2 rounded-xl font-medium"
                    >
                      Done ✓
                    </button>
                  ) : (
                    <span className="text-[11px] text-neutral-500 py-1.5 px-3 bg-neutral-950 rounded-xl">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: RATES */}
      {activeTab === "services" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Manage Rates ({selectedShop?.name})
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 text-neutral-950 font-bold text-xs px-3 py-1 rounded-xl shadow-sm"
            >
              + Add Service
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-3 space-y-2">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white">{srv.name}</p>
                  <p className="text-[10px] text-neutral-500">{srv.category} • {srv.duration}</p>
                </div>

                <div className="flex items-center gap-2">
                  {editingId === srv.id ? (
                    <>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                        className="w-16 bg-neutral-900 border border-amber-500 rounded-xl px-2 py-1 text-xs text-white text-right focus:outline-none"
                      />
                      <button
                        onClick={() => savePrice(srv.id)}
                        className="bg-emerald-500 text-neutral-950 text-xs px-2.5 py-1 rounded-xl font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-neutral-500 text-xs px-1"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-amber-400 mr-1">
                        ₹{srv.price_num || 100}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(srv.id);
                          setEditPrice(srv.price_num || 100);
                        }}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] px-2.5 py-1 rounded-xl"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* TAB 3: SHOP STATUS, CATEGORY & DELETE */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          
          {/* NAYA IDEA 1: SHARE BOOKING LINK */}
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Share Your Shop</h2>
              <p className="text-[11px] text-neutral-400 mt-1">Get direct bookings via WhatsApp/Instagram</p>
            </div>
            <button
              onClick={copyShopLink}
              className="bg-indigo-500 hover:bg-indigo-400 text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs transition"
            >
              🔗 Copy Link
            </button>
          </div>

          {/* SHOP CATEGORY SWITCHER (Men/Women/Unisex) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              1. Shop Category (Men / Women)
            </h2>
            <p className="text-[11px] text-neutral-400">
              Change who your salon caters to. This updates your listing on the marketplace instantly.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["men", "women", "unisex"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => updateShopCategory(cat)}
                  className={`py-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                    (selectedShop?.category || "unisex") === cat
                      ? "bg-amber-500 text-neutral-950 font-bold border-amber-500 shadow-md"
                      : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                  }`}
                >
                  <span className="text-xl">
                    {cat === "men" ? "✂️" : cat === "women" ? "🌸" : "✨"}
                  </span>
                  <span className="text-[10px] uppercase font-bold">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SHOP OPEN / CLOSED STATUS */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              2. Shop Open / Closed Status
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Current Status</p>
                <p className="text-[11px] text-neutral-400">
                  {selectedShop?.is_open !== false
                    ? "🟢 Open (Accepting Bookings)"
                    : "🔴 Closed (Not Taking Appointments)"}
                </p>
              </div>

              <button
                onClick={toggleShopStatus}
                className={`text-xs font-bold px-4 py-2 rounded-xl border transition ${
                  selectedShop?.is_open !== false
                    ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                {selectedShop?.is_open !== false ? "Close Temporarily" : "Open Shop Now"}
              </button>
            </div>
          </div>

          {/* PERMANENTLY DELETE SHOP */}
          <div className="bg-red-950/20 border border-red-500/30 rounded-3xl p-5 space-y-3">
            <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">
              3. Permanently Delete Shop
            </h2>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Agar aapne test karne ke liye faltu shops bana li hain, toh aap yahan se current shop ko poori tarah delete kar sakte hain.
            </p>

            <button
              onClick={deleteCurrentShop}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-2xl text-xs transition shadow-lg shadow-red-600/20"
            >
              🗑️ Delete &quot;{selectedShop?.name}&quot;
            </button>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl w-full max-w-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add New Service</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={addNewService} className="space-y-3">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Service Name</label>
                <input
                  type="text"
                  placeholder="e.g. Beard Color / D-Tan"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">Duration</label>
                  <input
                    type="text"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-neutral-950 font-bold py-2.5 rounded-xl text-xs"
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
