"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function MarketplaceHome() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [ownedShopId, setOwnedShopId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<"all" | "men" | "women">("all");
  const [sortByRating, setSortByRating] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  const fetchShops = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shops")
      .select("*")
      .order("rating", { ascending: false });

    if (data) {
      setShops(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchShops();

    // Jab user dashboard se homepage par return kare, auto-refresh fresh data
    const handleFocus = () => fetchShops();
    window.addEventListener("focus", handleFocus);

    const checkUserAndShop = async (email: string | null) => {
      if (!email) {
        setCurrentEmail(null);
        setOwnedShopId(null);
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      setCurrentEmail(cleanEmail);

      const { data } = await supabase
        .from("shops")
        .select("id")
        .ilike("owner_email", cleanEmail)
        .limit(1);

      if (data && data.length > 0) {
        setOwnedShopId(data[0].id);
      } else {
        setOwnedShopId(null);
      }
    };

    try {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user?.email) {
          checkUserAndShop(user.email);
        } else {
          const fallback = localStorage.getItem("customer_user_email");
          checkUserAndShop(fallback);
        }
      });
      return () => {
        unsub();
        window.removeEventListener("focus", handleFocus);
      };
    } catch {
      const fallback = localStorage.getItem("customer_user_email");
      checkUserAndShop(fallback);
      return () => window.removeEventListener("focus", handleFocus);
    }
  }, [fetchShops]);

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
    .sort((a, b) => {
      if (sortByRating) {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 max-w-lg mx-auto pb-14 font-sans">
      <div className="flex items-center justify-between py-3 border-b border-neutral-900 mb-4">
        <div>
          <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider">
            Salon & Parlour Marketplace
          </span>
          <h1 className="text-xl font-extrabold text-white">Find Top Rated Salons</h1>
        </div>

        {currentEmail && (
          ownedShopId ? (
            <button
              onClick={() => router.push("/portal-access/dashboard")}
              className="text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>💈</span> My Salon
            </button>
          ) : (
            <button
              onClick={() => router.push("/register-shop")}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3 py-1.5 rounded-xl font-bold transition shadow-md shadow-amber-500/10"
            >
              + Register Shop
            </button>
          )
        )}
      </div>

      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by salon name or area..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl mb-4">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`py-2 rounded-xl text-xs font-bold transition ${
            selectedCategory === "all"
              ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          All Salons
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("men")}
          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            selectedCategory === "men"
              ? "bg-amber-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <span>✂️</span> Men / Gents
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("women")}
          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            selectedCategory === "women"
              ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <span>🌸</span> Women / Parlour
        </button>
      </div>

      <div className="flex items-center justify-between px-1 mb-3 text-[11px] text-neutral-400 font-medium">
        <span>Showing {filteredShops.length} salons nearby</span>
        <button
          onClick={() => setSortByRating(!sortByRating)}
          className="text-amber-400 hover:underline flex items-center gap-1"
        >
          ⭐ {sortByRating ? "Sorted by Highest Rating" : "Default Order"}
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-neutral-500 text-xs animate-pulse">
            Finding verified top-rated salons...
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900 rounded-3xl border border-neutral-800 p-6 space-y-3">
            <p className="text-sm font-semibold text-neutral-300">No matching salons found.</p>
            <p className="text-xs text-neutral-500">Try changing the category or search keyword.</p>
          </div>
        ) : (
          filteredShops.map((shop) => {
            const isMyOwnShop =
              currentEmail &&
              shop.owner_email &&
              shop.owner_email.trim().toLowerCase() === currentEmail.trim().toLowerCase();

            const ratingNum = Number(shop.rating) || 5.0;
            const normalizedCat = (shop.category || "").toString().trim().toLowerCase();

            return (
              <div
                key={shop.id}
                className="bg-neutral-900 border border-neutral-800/90 rounded-3xl overflow-hidden hover:border-amber-500/50 transition duration-200 group shadow-xl"
              >
                <div
                  onClick={() => {
                    if (isMyOwnShop) {
                      router.push("/portal-access/dashboard");
                    } else {
                      router.push(`/shop/${shop.id}`);
                    }
                  }}
                  className="h-44 w-full relative overflow-hidden bg-neutral-950 cursor-pointer"
                >
                  <img
                    src={
                      shop.image_url ||
                      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80"
                    }
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />

                  <div className="absolute top-3 right-3 bg-neutral-950/85 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-800 text-xs font-extrabold flex items-center gap-1">
                    <span className="text-amber-400">★</span>
                    <span className="text-white">{ratingNum.toFixed(1)}</span>
                    <span className="text-[10px] text-neutral-400 font-normal">/ 5</span>
                  </div>

                  <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-neutral-800 text-[10px] font-bold text-neutral-300">
                    {normalizedCat === "women"
                      ? "🌸 WOMEN ONLY"
                      : normalizedCat === "men"
                      ? "✂️ GENTS ONLY"
                      : "✨ UNISEX"}
                  </div>

                  {isMyOwnShop ? (
                    <div className="absolute bottom-3 left-3 bg-amber-500 text-neutral-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-md">
                      YOUR SALON (OWNER)
                    </div>
                  ) : (
                    <div className="absolute bottom-3 left-3 bg-emerald-500 text-neutral-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                      OPEN NOW
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2
                        onClick={() => {
                          if (isMyOwnShop) {
                            router.push("/portal-access/dashboard");
                          } else {
                            router.push(`/shop/${shop.id}`);
                          }
                        }}
                        className="text-base font-bold text-white group-hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5"
                      >
                        {shop.name}
                      </h2>
                      <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                        📍 {shop.address} {shop.city ? `(${shop.city})` : ""}
                      </p>
                    </div>

                    {shop.map_link && (
                      <a
                        href={shop.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border border-neutral-700 whitespace-nowrap transition"
                      >
                        🗺️ Map
                      </a>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                    <span className="text-neutral-400 text-[11px]">
                      📞 {shop.phone || "Verified Listing"}
                    </span>

                    {isMyOwnShop ? (
                      <button
                        onClick={() => router.push("/portal-access/dashboard")}
                        className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/20 transition"
                      >
                        Dashboard ✂️
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/shop/${shop.id}`)}
                        className="text-amber-400 font-bold hover:translate-x-1 transition flex items-center gap-1"
                      >
                        Check Ratings & Book →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
