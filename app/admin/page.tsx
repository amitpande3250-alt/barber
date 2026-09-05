"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function AdminVerificationDashboard() {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingShops, setPendingShops] = useState<any[]>([]);
  const [verifiedShops, setVerifiedShops] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "live">("pending");
  const router = useRouter();

  const fetchAdminShops = useCallback(async () => {
    setLoading(true);
    // 1. Pending verification
    const { data: pending } = await supabase
      .from("shops")
      .select("*")
      .eq("is_verified", false)
      .order("created_at", { ascending: false });
    if (pending) setPendingShops(pending);

    // 2. Already live
    const { data: live } = await supabase
      .from("shops")
      .select("*")
      .eq("is_verified", true)
      .order("created_at", { ascending: false });
    if (live) setVerifiedShops(live);

    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const email = user?.email || localStorage.getItem("customer_user_email");
      const cleanEmail = (email || "").trim().toLowerCase();
      setCurrentEmail(cleanEmail);

      if (cleanEmail !== "amitpande3250@gmail.com") {
        alert("Access Denied: Only Master Admin can access this dashboard.");
        router.push("/");
        return;
      }
      fetchAdminShops();
    });

    return () => unsub();
  }, [router, fetchAdminShops]);

  const approveShop = async (shopId: string, shopName: string) => {
    const { error } = await supabase
      .from("shops")
      .update({ is_verified: true })
      .eq("id", shopId);

    if (!error) {
      alert(`"${shopName}" is now verified and live on UNI saloon!`);
      fetchAdminShops();
    } else {
      alert("Verification failed: " + error.message);
    }
  };

  const deleteShop = async (shopId: string, shopName: string) => {
    const confirmed = window.confirm(`Permanently remove "${shopName}"?`);
    if (!confirmed) return;

    await supabase.from("bookings").delete().eq("shop_id", shopId);
    await supabase.from("barbers").delete().eq("shop_id", shopId);
    const { error } = await supabase.from("shops").delete().eq("id", shopId);

    if (!error) {
      alert(`"${shopName}" deleted successfully.`);
      fetchAdminShops();
    } else {
      alert("Delete failed: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 p-6 flex items-center justify-center text-xs">
        Checking Admin Access & Loading Real Location Data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 max-w-2xl mx-auto p-4 pb-20 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
        <div>
          <span className="text-[10px] text-red-400 font-black uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/30">
            Master Verification Control
          </span>
          <h1 className="text-xl font-black text-white mt-1">UNI saloon Admin Audit</h1>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 px-3 py-1.5 rounded-xl hover:text-white transition"
        >
          ← Marketplace
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-1 rounded-2xl mb-4 border border-neutral-800">
        <button
          onClick={() => setActiveTab("pending")}
          className={`py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "pending"
              ? "bg-amber-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          ⚠️ Pending Review ({pendingShops.length})
        </button>
        <button
          onClick={() => setActiveTab("live")}
          className={`py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "live"
              ? "bg-emerald-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          ✓ Live Salons ({verifiedShops.length})
        </button>
      </div>

      {/* Pending Reviews List */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingShops.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/50 rounded-3xl border border-neutral-800/80 p-6 text-xs text-neutral-500">
              🎉 No pending shops. All submitted salons have been verified!
            </div>
          ) : (
            pendingShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-4 space-y-3 shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-md border border-amber-500/20">
                      Category: {(shop.category || "Unisex").toUpperCase()}
                    </span>
                    <h2 className="text-base font-extrabold text-white mt-1">{shop.name}</h2>
                    <p className="text-xs text-neutral-400">Owner Email: <span className="text-neutral-200">{shop.owner_email || "N/A"}</span></p>
                    <p className="text-xs text-neutral-400">Phone: <span className="text-neutral-200">{shop.phone || "Not provided"}</span></p>
                  </div>

                  <span className="text-[10px] bg-red-500/10 text-red-400 font-bold px-2.5 py-1 rounded-full border border-red-500/30">
                    Needs Review
                  </span>
                </div>

                {/* Location Inspection Box */}
                <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 space-y-1.5">
                  <p className="text-xs text-neutral-300">
                    📍 <strong className="text-white">Physical Address:</strong> {shop.address} {shop.city ? `, ${shop.city}` : ""}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {shop.map_link ? (
                      <a
                        href={shop.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-md"
                      >
                        🗺️ Inspect on Google Maps ↗
                      </a>
                    ) : (
                      <span className="text-[11px] text-red-400">⚠️ No direct map coordinate link submitted</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => approveShop(shop.id, shop.name)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1"
                  >
                    ✓ Verify & Publish Live
                  </button>
                  <button
                    onClick={() => deleteShop(shop.id, shop.name)}
                    className="bg-red-950 border border-red-500/40 hover:bg-red-900/60 text-red-300 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1"
                  >
                    ✕ Reject / Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Already Live List */}
      {activeTab === "live" && (
        <div className="space-y-3">
          {verifiedShops.map((shop) => (
            <div
              key={shop.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex items-center justify-between"
            >
              <div>
                <h3 className="text-xs font-bold text-white">{shop.name}</h3>
                <p className="text-[10px] text-neutral-400">📍 {shop.address} | 📞 {shop.phone || "N/A"}</p>
                <p className="text-[10px] text-neutral-500">Owner: {shop.owner_email}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {shop.map_link && (
                  <a
                    href={shop.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    Map ↗
                  </a>
                )}
                <button
                  onClick={() => deleteShop(shop.id, shop.name)}
                  className="bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
