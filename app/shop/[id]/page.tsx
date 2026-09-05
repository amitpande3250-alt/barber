"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mwlfmnkpgrjbudfdgnmh.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGZtbmtwZ3JqYnVkZmRnbm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTk0NzUsImV4cCI6MjEwMzk5NTQ3NX0.fCRrWYa_BDIbg9C9B9upNFFVZpvJ_v5YcdUaeI2Bf_k"
);

// Fallback Women Services agar database me abhi add na ho
const defaultWomenServices = [
  { id: "w-haircut", name: "Haircut, Layering & Blowdry", price_num: 400, price: "₹400", duration: "35 min", category: "women" },
  { id: "w-spa", name: "Deep Nourishing Hair Spa", price_num: 799, price: "₹799", duration: "45 min", category: "women" },
  { id: "w-eyebrows", name: "Threading & Eyebrows", price_num: 60, price: "₹60", duration: "10 min", category: "women" },
  { id: "w-facial", name: "Fruit Glow Facial & Cleanup", price_num: 599, price: "₹599", duration: "40 min", category: "women" },
  { id: "w-waxing", name: "Full Arms & Legs Waxing", price_num: 450, price: "₹450", duration: "30 min", category: "women" },
];

export default function ShopDetailPage() {
  const params = useParams();
  const shopId = params.id as string;
  const router = useRouter();

  // Category State (Men vs Women)
  const [category, setCategory] = useState<"men" | "women">("men");

  // Firebase User
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Shop & Services Data
  const [shop, setShop] = useState<any>(null);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [slots, setSlots] = useState<{ time: string; isFree: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Star Rating
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setCustomerName(user.displayName || "");
        setCustomerEmail(user.email || "");

        await supabase.from("registered_users").upsert(
          {
            firebase_uid: user.uid,
            email: user.email,
            display_name: user.displayName,
          },
          { onConflict: "firebase_uid" }
        );
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      alert("Sign In Failed: " + err.message);
    }
  };

  useEffect(() => {
    loadShopDetails();
  }, [shopId]);

  const loadShopDetails = async () => {
    const { data: sData } = await supabase.from("shops").select("*").eq("id", shopId).single();
    if (sData) setShop(sData);

    const { data: srvData } = await supabase.from("shop_services").select("*").eq("shop_id", shopId);
    let initialList: any[] = [];
    if (srvData && srvData.length > 0) {
      const tagged = srvData.map((s: any) => ({
        ...s,
        category: s.category || "men",
      }));
      const hasWomen = tagged.some((s: any) => s.category === "women");
      initialList = hasWomen ? tagged : [...tagged, ...defaultWomenServices];
    } else {
      initialList = defaultWomenServices;
    }

    setAllServices(initialList);
    const firstActive = initialList.filter((s) => (s.category || "men") === "men");
    if (firstActive.length > 0) {
      setSelectedServices([firstActive[0]]);
    }

    const { data: bData } = await supabase.from("barbers").select("*").eq("shop_id", shopId);
    if (bData && bData.length > 0) {
      setBarbers(bData);
      setSelectedBarber(bData[0]);
    }
  };

  // Filtered by Selected Gender/Category
  const displayedServices = allServices.filter(
    (s) => (s.category || "men").toLowerCase() === category
  );

  const handleCategorySwitch = (newCat: "men" | "women") => {
    setCategory(newCat);
    const newAvailable = allServices.filter((s) => (s.category || "men").toLowerCase() === newCat);
    if (newAvailable.length > 0) {
      setSelectedServices([newAvailable[0]]);
    } else {
      setSelectedServices([]);
    }
  };

  useEffect(() => {
    if (selectedBarber && selectedDate) {
      checkSlots();
    }
  }, [selectedBarber, selectedDate]);

  const checkSlots = async () => {
    setLoadingSlots(true);
    setSelectedSlot("");
    try {
      const res = await fetch("/api/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: selectedBarber.id,
          date: selectedDate,
        }),
      });
      const data = await res.json();
      if (data.slots) setSlots(data.slots);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlots(false);
    }
  };

  const toggleService = (srv: any) => {
    const isAlreadySelected = selectedServices.some((item) => item.id === srv.id);
    if (isAlreadySelected) {
      if (selectedServices.length === 1) {
        alert("Please keep at least one service selected.");
        return;
      }
      setSelectedServices(selectedServices.filter((item) => item.id !== srv.id));
    } else {
      setSelectedServices([...selectedServices, srv]);
    }
  };

  const totalPrice = selectedServices.reduce((acc, curr) => {
    const p = curr.price_num || parseInt(curr.price?.replace(/[^\d]/g, "")) || 0;
    return acc + p;
  }, 0);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !customerName || !customerPhone || selectedServices.length === 0) return;

    setIsSubmitting(true);
    const serviceNames = selectedServices.map((s) => s.name).join(" + ");

    const { error } = await supabase.from("bookings").insert({
      shop_id: shopId,
      barber_id: selectedBarber?.id || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || currentUser?.email || "guest@user.com",
      service_name: `[${category.toUpperCase()}] ${serviceNames}`,
      selected_services: serviceNames,
      total_price: totalPrice,
      booking_date: selectedDate,
      booking_time: selectedSlot,
      status: "confirmed",
      whatsapp_notified: false,
    });

    setIsSubmitting(false);

    if (!error) {
      setBookingSuccess(true);
      checkSlots();
    } else {
      alert("Booking error: " + error.message);
    }
  };

  const submitRating = async () => {
    if (!customerName) return;
    await supabase.from("shop_reviews").insert({
      shop_id: shopId,
      customer_name: customerName,
      rating: ratingStars,
      comment: reviewComment,
    });

    const { data: allReviews } = await supabase
      .from("shop_reviews")
      .select("rating")
      .eq("shop_id", shopId);

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabase
        .from("shops")
        .update({ rating: Number(avg.toFixed(1)) })
        .eq("id", shopId);
    }

    setReviewSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 max-w-lg mx-auto pb-28 font-sans">
      {/* Navigation & Auth Bar */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => router.push("/")}
          className="text-xs text-amber-500 font-semibold flex items-center gap-1"
        >
          ← Back to All Salons
        </button>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400">
              {currentUser.email?.split("@")[0]}
            </span>
            <button
              onClick={() => signOut(auth)}
              className="text-[10px] text-red-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleGoogleSignIn}
            className="text-xs font-semibold bg-neutral-900 border border-amber-500/40 text-amber-400 px-2.5 py-1 rounded-xl hover:bg-neutral-800"
          >
            Google Sign In
          </button>
        )}
      </div>

      {/* Shop Banner Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden mb-5 shadow-xl">
        <div className="h-48 w-full relative bg-neutral-950">
          <img
            src={shop?.image_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80"}
            alt={shop?.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-neutral-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-800 text-xs text-amber-400 font-bold">
            ⭐ {shop?.rating || "5.0"}
          </div>
        </div>

        <div className="p-4 space-y-2">
          <h1 className="text-xl font-bold text-white">{shop?.name || "Barber Lounge"}</h1>
          <p className="text-xs text-neutral-400">
            📍 {shop?.address || "Main Market"} {shop?.city ? `(${shop?.city})` : ""}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-amber-500 font-medium"> 📞 {shop?.phone || "Contact Available"}</span>
            {shop?.map_link && (
              <a
                href={shop.map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-400 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl font-semibold hover:border-amber-500/40 transition"
              >
                🗺️ Directions
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Category Toggle (Men / Women) */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-2xl mb-5">
        <button
          type="button"
          onClick={() => handleCategorySwitch("men")}
          className={`py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            category === "men"
              ? "bg-amber-500 text-neutral-950 shadow-md"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <span>✂️</span>
          <span>Men's Lounge</span>
        </button>
        <button
          type="button"
          onClick={() => handleCategorySwitch("women")}
          className={`py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            category === "women"
              ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <span>🌸</span>
          <span>Women's Salon</span>
        </button>
      </div>

      {bookingSuccess ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-500 text-neutral-950 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h2 className="text-lg font-bold text-emerald-400">Appointment Confirmed!</h2>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-xs text-left space-y-1.5 text-neutral-300">
            <p><strong className="text-white">Shop:</strong> {shop?.name}</p>
            <p><strong className="text-white">Category:</strong> {category === "men" ? "Men's Lounge" : "Women's Salon"}</p>
            <p><strong className="text-white">Services:</strong> {selectedServices.map((s) => s.name).join(", ")}</p>
            <p><strong className="text-white">Total Bill:</strong> <span className="text-emerald-400 font-bold">₹{totalPrice}</span></p>
            <p><strong className="text-white">Barber / Specialist:</strong> {selectedBarber?.name} ({selectedBarber?.specialty || "Specialist"})</p>
            <p><strong className="text-white">Appointment Slot:</strong> {selectedDate} at {selectedSlot}</p>
            <p className="text-[11px] text-amber-400 pt-2 border-t border-neutral-800">
              📲 WhatsApp confirmation will be sent to your phone!
            </p>
          </div>

          {/* Star Rating Section */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2 text-left">
            <h3 className="text-xs font-bold text-white">Rate This Salon</h3>
            {reviewSubmitted ? (
              <p className="text-xs text-amber-400 font-medium text-center py-2">
                Thank you for your rating! ⭐
              </p>
            ) : (
              <>
                <div className="flex gap-2 justify-center py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingStars(star)}
                      className={`text-2xl transition ${
                        star <= ratingStars ? "text-amber-400" : "text-neutral-700"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Leave a short review (Optional)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={submitRating}
                  className="w-full bg-amber-500 text-neutral-950 font-bold py-2 rounded-xl text-xs"
                >
                  Submit Rating
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-2xl text-xs transition"
          >
            Explore Other Salons
          </button>
        </div>
      ) : (
        <form onSubmit={handleBooking} className="space-y-5">
          {/* 1. Services Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-300">
                1. Select Services ({category === "men" ? "Gents" : "Ladies"})
              </label>
              <span className="text-[10px] text-amber-400 font-medium">
                {selectedServices.length} Selected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {displayedServices.map((s) => {
                const isSelected = selectedServices.some((item) => item.id === s.id);
                const itemPrice = s.price_num || parseInt(s.price?.replace(/[^\d]/g, "")) || 0;
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleService(s)}
                    className={`p-3 rounded-2xl border cursor-pointer transition text-left flex flex-col justify-between ${
                      isSelected
                        ? category === "men"
                          ? "bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                          : "bg-pink-500/15 border-pink-500 text-white shadow-lg shadow-pink-500/10"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-white leading-snug">{s.name}</p>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                          isSelected
                            ? category === "men"
                              ? "bg-amber-500 border-amber-500 text-black"
                              : "bg-pink-500 border-pink-500 text-white"
                            : "border-neutral-700"
                        }`}
                      >
                        {isSelected && "✓"}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                      <span className={`text-xs font-bold ${category === "men" ? "text-amber-400" : "text-pink-400"}`}>
                        ₹{itemPrice}
                      </span>
                      <span className="text-[10px] text-neutral-500">{s.duration}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Choose Barber / Specialist */}
          {barbers.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-2">
                2. Choose Specialist
              </label>
              <div className="grid grid-cols-2 gap-2">
                {barbers.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBarber(b)}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      selectedBarber?.id === b.id
                        ? "bg-amber-500 text-neutral-950 font-bold border-amber-500"
                        : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <p className="text-xs font-bold truncate">{b.name}</p>
                    <p
                      className={`text-[10px] mt-0.5 ${
                        selectedBarber?.id === b.id ? "text-neutral-950 font-medium" : "text-amber-500"
                      }`}
                    >
                      ⭐ {b.specialty || "All-Rounder"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Choose Date */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-2">
              3. Date of Visit
            </label>
            <input
              type="date"
              value={selectedDate}
              min={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 4. Time Slot */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-300">
                4. Select Time Slot
              </label>
              <span className="text-[10px] text-neutral-500">
                {loadingSlots ? "Checking slots..." : "Green = Free to Book"}
              </span>
            </div>

            {loadingSlots ? (
              <div className="text-center py-6 text-xs text-neutral-500 animate-pulse">
                Checking availability...
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.time}
                    disabled={!slot.isFree}
                    onClick={() => setSelectedSlot(slot.time)}
                    className={`py-2.5 rounded-xl text-xs font-medium transition ${
                      !slot.isFree
                        ? "bg-neutral-900/40 text-neutral-600 border border-neutral-900 cursor-not-allowed line-through"
                        : selectedSlot === slot.time
                        ? "bg-emerald-500 text-neutral-950 font-bold shadow-lg shadow-emerald-500/20"
                        : "bg-neutral-900 border border-neutral-800 text-neutral-200 hover:border-emerald-500/50"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {["10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setSelectedSlot(t)}
                    className={`py-2.5 rounded-xl text-xs font-medium transition ${
                      selectedSlot === t
                        ? "bg-emerald-500 text-neutral-950 font-bold"
                        : "bg-neutral-900 border border-neutral-800 text-neutral-200 hover:border-emerald-500/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. Customer Details */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-neutral-300 block">
              5. Customer Contact & WhatsApp Details
            </label>
            <input
              type="text"
              placeholder="Your Full Name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
            <input
              type="tel"
              placeholder="WhatsApp Number (e.g. 919876543210)"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
            <input
              type="email"
              placeholder="Your Email Address"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Sticky Total & Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 max-w-lg mx-auto flex items-center justify-between gap-4 z-50">
            <div>
              <span className="text-[10px] text-neutral-400 block uppercase font-medium">Total Amount</span>
              <span className="text-lg font-black text-amber-400">₹{totalPrice}</span>
              <span className="text-[10px] text-neutral-500 block">({selectedServices.length} items)</span>
            </div>

            <button
              type="submit"
              disabled={!selectedSlot || isSubmitting}
              className={`flex-1 font-bold py-3.5 rounded-2xl text-sm transition duration-200 shadow-lg ${
                !selectedSlot || isSubmitting
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : category === "men"
                  ? "bg-amber-500 hover:bg-amber-400 text-neutral-950"
                  : "bg-pink-500 hover:bg-pink-400 text-white"
              }`}
            >
              {isSubmitting ? "Booking..." : selectedSlot ? `Book for ₹${totalPrice}` : "Select a Slot"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
