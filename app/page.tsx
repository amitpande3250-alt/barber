"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function MarketplaceHome() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [ownedShopId, setOwnedShopId] = useState<string | null>(null);

  const [pendingReviewBooking, setPendingReviewBooking] = useState<any>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<"all" | "men" | "women">("all");
  const [sortByRating, setSortByRating] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  const isAdmin = !authLoading && currentEmail === "amitpande3250@gmail.com";

  const fetchShops = useCallback(async () => {
    setLoading(true);
    const { data: verified } = await supabase
      .from("shops")
      .select("*")
      .eq("is_verified", true)
      .order("rating", { ascending: false });

    if (verified) setShops(verified);
    setLoading(false);
  }, []);

  const checkCustomerReviews = async (email: string) => {
    const { data } = await supabase
      .from("bookings")
      .select("*, shops(name)")
      .ilike("customer_phone", `%${email}%`)
      .eq("status", "completed")
      .is("rating", null)
      .limit(1);

    if (data && data.length > 0) {
      setPendingReviewBooking(data[0]);
    }
  };

  useEffect(() => {
    fetchShops();

    const unsub = onAuthStateChanged(auth, async (user) => {
      const email = user?.email || localStorage.getItem("customer_user_email");
      if (email && email.trim().length > 0) {
        const clean = email.trim().toLowerCase();
        setCurrentEmail(clean);
        checkCustomerReviews(clean);

        const { data } = await supabase
          .from("shops")
          .select("id")
          .ilike("owner_email", clean)
          .limit(1);

        if (data && data.length > 0) {
          setOwnedShopId(data[0].id);
        } else {
          setOwnedShopId(null);
        }
      } else {
        setCurrentEmail(null);
        setOwnedShopId(null);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, [fetchShops]);

  const submitReview = async () => {
    if (!pendingReviewBooking) return;
    await supabase
      .from("bookings")
      .update({ rating: ratingVal, review_comment: reviewText })
      .eq("id", pendingReviewBooking.id);

    alert("Review submitted!");
    setPendingReviewBooking(null);
  };

  const filteredShops = shops
    .filter((shop) => {
      const rawCat = (shop.category || "").toString().trim().toLowerCase();
      const shopCat = rawCat === "women" ? "women" : rawCat === "men" ? "men" : "unisex";

      const matchesCategory =
        selectedCategory === "all" ||
        shopCat === selectedCategory ||
        shopCat === "unisex";

      const matchesSearch =
        shop.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.city?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => (sortByRating ? (Number(b.rating) || 0) - (Number(a.rating) || 0) : 0));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 max-w-lg mx-auto pb-20 font-sans">
      {/* 1. REVIEW MODAL */}
      {pendingReviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl w-full max-w-xs space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Rate your salon service</h3>
            <p className="text-xs text-neutral-400">
              Service at <strong className="text-amber-400">{pendingReviewBooking.shops?.name}</strong> completed!
            </p>

            <div className="flex justify-center gap-2 text-2xl cursor-pointer">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  onClick={() => setRatingVal(s)}
                  className={s <= ratingVal ? "text-amber-400" : "text-neutral-700"}
                >
                  ★
                </span>
              ))}
            </div>

            <textarea
              placeholder="Leave feedback (optional)..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-xs text-white"
              rows={2}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setPendingReviewBooking(null)}
                className="w-1/2 py-2 text-xs text-neutral-400 bg-neutral-800 rounded-xl"
              >
                Later
              </button>
              <button
                onClick={submitReview}
                className="w-1/2 py-2 text-xs font-bold text-neutral-950 bg-amber-500 rounded-xl"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOP BAR & SEARCH */}
      <section className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search salon name, city, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition"
            />
            <span className="absolute left-3.5 top-2.5 text-neutral-500 text-xs">🔍</span>
          </div>

          {/* Action Button: ONLY when logged in */}
          {!authLoading && currentEmail && (
            isAdmin ? (
              <button
                onClick={() => router.push("/admin")}
                className="text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 px-3 py-2.5 rounded-2xl font-bold transition flex items-center gap-1 shrink-0"
              >
                🛡️ Admin
              </button>
            ) : ownedShopId ? (
              <button
                onClick={() => router.push("/portal-access/dashboard")}
                className="text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3 py-2.5 rounded-2xl font-bold transition flex items-center gap-1 shrink-0"
              >
                <span>💈</span> Dashboard
              </button>
            ) : (
              <button
                onClick={() => router.push("/register-shop")}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3 py-2.5 rounded-2xl font-bold transition shrink-0 shadow-sm"
              >
                + Register
              </button>
            )
          )}
        </div>
      </section>

      {/* 3. CATEGORY TABS */}
      <div className="p-4 space-y-4 pt-2">
        <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              selectedCategory === "all" ? "bg-neutral-800 text-white" : "text-neutral-400"
            }`}
          >
            All Studios
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("men")}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              selectedCategory === "men" ? "bg-amber-500 text-neutral-950" : "text-neutral-400"
            }`}
          >
            <span>✂️</span> Men
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("women")}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              selectedCategory === "women" ? "bg-pink-500 text-white" : "text-neutral-400"
            }`}
          >
            <span>🌸</span> Women
          </button>
        </div>

        {/* 4. VERIFIED SALONS */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-center py-12 text-xs text-neutral-500 animate-pulse">
              Finding verified salons...
            </p>
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-12 bg-neutral-900 rounded-3xl border border-neutral-800 p-6 text-xs text-neutral-500">
              No verified salons available.
            </div>
          ) : (
            filteredShops.map((shop) => {
              const rawCat = (shop.category || "").toString().trim().toLowerCase();

              return (
                <div
                  key={shop.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-lg"
                >
                  <div className="h-40 w-full bg-neutral-950 relative">
                    <img
                      src={
                        shop.image_url ||
                        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80"
                      }
                      alt={shop.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-neutral-800 text-white">
                      {rawCat === "women"
                        ? "🌸 WOMEN ONLY"
                        : rawCat === "men"
                        ? "✂️ GENTS ONLY"
                        : "✨ UNISEX"}
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">{shop.name}</h3>
                      <p className="text-xs text-neutral-400 line-clamp-1">📍 {shop.address}</p>
                    </div>

                    <button
                      onClick={() => router.push(`/shop/${shop.id}`)}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black px-4 py-2.5 rounded-xl shrink-0 transition"
                    >
                      Book Chair →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
