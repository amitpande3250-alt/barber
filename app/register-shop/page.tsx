"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/firebase";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mwlfmnkpgrjbudfdgnmh.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGZtbmtwZ3JqYnVkZmRnbm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTk0NzUsImV4cCI6MjEwMzk5NTQ3NX0.fCRrWYa_BDIbg9C9B9upNFFVZpvJ_v5YcdUaeI2Bf_k"
);

const SPECIALTIES = [
  "Fade & Beard Specialist",
  "Classic Haircut & Styling",
  "Head Massage & Spa",
  "Hair Dye & Coloring Expert",
  "Women Haircut & Blowdry",
  "Facial & Skin Care",
  "Bridal & Beauty Specialist",
  "All-Rounder Stylist",
];

export default function RegisterShopPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);

  // Owner Email
  const [ownerEmail, setOwnerEmail] = useState("");

  // Category: Men, Women, or Unisex
  const [shopCategory, setShopCategory] = useState<"men" | "women" | "unisex">("unisex");

  // Shop details
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  // Default Rates (Dynamic based on Category)
  const [haircutPrice, setHaircutPrice] = useState(150);
  const [beardPrice, setBeardPrice] = useState(50);
  const [colorPrice, setColorPrice] = useState(250);
  const [massagePrice, setMassagePrice] = useState(120);

  // Women Specific Rates
  const [spaPrice, setSpaPrice] = useState(699);
  const [facialPrice, setFacialPrice] = useState(499);

  // Barbers / Stylists
  const [barbersList, setBarbersList] = useState<Array<{ name: string; specialty: string }>>([
    { name: "", specialty: SPECIALTIES[1] },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("customer_user_email") || auth.currentUser?.email || "";
    setOwnerEmail(saved);
  }, []);

  const addBarberField = () => {
    setBarbersList([...barbersList, { name: "", specialty: SPECIALTIES[0] }]);
  };

  const removeBarberField = (index: number) => {
    if (barbersList.length === 1) return;
    setBarbersList(barbersList.filter((_, i) => i !== index));
  };

  const updateBarber = (index: number, field: "name" | "specialty", value: string) => {
    const updated = [...barbersList];
    updated[index][field] = value;
    setBarbersList(updated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setMapLink(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        setFetchingGps(false);
      },
      () => setFetchingGps(false),
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !address || !phone) {
      alert("Please fill all required details.");
      return;
    }

    const validBarbers = barbersList.filter((b) => b.name.trim().length > 0);
    if (validBarbers.length === 0) {
      alert("Please add at least one barber or stylist.");
      return;
    }

    setIsSubmitting(true);

    try {
      const activeEmail = ownerEmail || localStorage.getItem("customer_user_email") || "owner@example.com";

      const generatedMapLink =
        mapLink ||
        (latitude && longitude
          ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              shopName + " " + address + " " + city
            )}`);

      // 1. Insert Shop with Owner Email and Category
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .insert({
          name: shopName,
          category: shopCategory,
          address: address,
          city: city || "Local",
          phone: phone,
          owner_email: activeEmail,
          map_link: generatedMapLink,
          latitude: latitude,
          longitude: longitude,
          image_url:
            photoPreview ||
            (shopCategory === "women"
              ? "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80"
              : "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80"),
          rating: 5.0,
        })
        .select()
        .single();

      if (shopError) throw shopError;
      const newShopId = shopData.id;

      localStorage.setItem("my_owned_shop_id", newShopId);

      // 2. Generate and Insert Services based on Category
      let servicesPayload: any[] = [];

      if (shopCategory === "men" || shopCategory === "unisex") {
        servicesPayload.push(
          {
            shop_id: newShopId,
            name: "Classic Haircut & Styling",
            category: "men",
            price: `₹${haircutPrice}`,
            price_num: Number(haircutPrice),
            duration: "25 min",
          },
          {
            shop_id: newShopId,
            name: "Beard Trim & Shape",
            category: "men",
            price: `₹${beardPrice}`,
            price_num: Number(beardPrice),
            duration: "15 min",
          },
          {
            shop_id: newShopId,
            name: "Hair Coloring & Dye",
            category: "men",
            price: `₹${colorPrice}`,
            price_num: Number(colorPrice),
            duration: "35 min",
          },
          {
            shop_id: newShopId,
            name: "Head Massage / Cleanup",
            category: "men",
            price: `₹${massagePrice}`,
            price_num: Number(massagePrice),
            duration: "20 min",
          }
        );
      }

      if (shopCategory === "women" || shopCategory === "unisex") {
        servicesPayload.push(
          {
            shop_id: newShopId,
            name: "Haircut, Styling & Blowdry",
            category: "women",
            price: `₹${shopCategory === "women" ? haircutPrice : 350}`,
            price_num: Number(shopCategory === "women" ? haircutPrice : 350),
            duration: "35 min",
          },
          {
            shop_id: newShopId,
            name: "Deep Nourishing Hair Spa",
            category: "women",
            price: `₹${spaPrice}`,
            price_num: Number(spaPrice),
            duration: "45 min",
          },
          {
            shop_id: newShopId,
            name: "Threading & Eyebrows",
            category: "women",
            price: "₹60",
            price_num: 60,
            duration: "10 min",
          },
          {
            shop_id: newShopId,
            name: "Glow Facial & Cleanup",
            category: "women",
            price: `₹${facialPrice}`,
            price_num: Number(facialPrice),
            duration: "40 min",
          }
        );
      }

      await supabase.from("shop_services").insert(servicesPayload);

      // 3. Insert Barbers / Stylists
      const barbersPayload = validBarbers.map((b) => ({
        shop_id: newShopId,
        name: b.name.trim(),
        specialty: b.specialty,
      }));
      await supabase.from("barbers").insert(barbersPayload);

      alert("Shop successfully registered!");
      router.push("/portal-access/dashboard");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 max-w-lg mx-auto pb-16">
      <button
        onClick={() => router.push("/")}
        className="text-xs text-amber-500 font-semibold mb-3 flex items-center gap-1"
      >
        ← Back to Marketplace
      </button>

      <div className="text-left mb-6">
        <span className="text-[11px] uppercase tracking-wider text-amber-500 font-bold">
          Shop Onboarding
        </span>
        <h1 className="text-xl font-extrabold text-white mt-0.5">Register Your Salon or Parlour</h1>
        <p className="text-xs text-neutral-400">
          Linked with your email: <strong className="text-amber-400">{ownerEmail || "Guest User"}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Shop Category Selector */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-2">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            1. Select Salon Type *
          </h2>
          <p className="text-[11px] text-neutral-400">Choose who your salon caters to:</p>
          
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShopCategory("men")}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                shopCategory === "men"
                  ? "bg-amber-500 text-neutral-950 font-bold border-amber-500 shadow-md"
                  : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <span className="text-lg">✂️</span>
              <span className="text-xs">Men / Gents</span>
            </button>

            <button
              type="button"
              onClick={() => setShopCategory("women")}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                shopCategory === "women"
                  ? "bg-pink-500 text-white font-bold border-pink-500 shadow-md shadow-pink-500/20"
                  : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <span className="text-lg">🌸</span>
              <span className="text-xs">Women / Parlour</span>
            </button>

            <button
              type="button"
              onClick={() => setShopCategory("unisex")}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                shopCategory === "unisex"
                  ? "bg-gradient-to-r from-amber-500 to-pink-500 text-neutral-950 font-extrabold border-transparent shadow-md"
                  : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <span className="text-lg">✨</span>
              <span className="text-xs">Unisex (Both)</span>
            </button>
          </div>
        </div>

        {/* 2. Shop Photo */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            2. Shop Photo
          </h2>
          {photoPreview ? (
            <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-neutral-700">
              <img src={photoPreview} alt="Shop Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotoPreview("")}
                className="absolute top-2 right-2 bg-black/80 text-xs text-red-400 px-2.5 py-1 rounded-xl"
              >
                Change
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-neutral-800 hover:border-amber-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition">
              <span className="text-2xl mb-1">📸</span>
              <span className="text-xs font-semibold text-neutral-300">Upload Shop Photo</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* 3. Basic Info */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            3. Shop & Location
          </h2>
          <div>
            <label className="text-xs text-neutral-300 block mb-1">Shop Name *</label>
            <input
              type="text"
              placeholder={shopCategory === "women" ? "e.g. Naturals Beauty Parlour" : "e.g. Royal Men Salon"}
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-neutral-300 block mb-1">City *</label>
              <input
                type="text"
                placeholder="e.g. Nashik"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-300 block mb-1">Phone Number *</label>
              <input
                type="tel"
                placeholder="+91 98XXXXXXXX"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-300 block mb-1">Address *</label>
            <input
              type="text"
              placeholder="Full shop address with landmark"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={fetchingGps}
            className="bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-neutral-700 transition"
          >
            📍 {fetchingGps ? "Detecting GPS..." : "Auto-Detect Location via GPS"}
          </button>
        </div>

        {/* 4. Staff Stylists / Barbers */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              4. Staff Stylists / Barbers
            </h2>
            <button
              type="button"
              onClick={addBarberField}
              className="bg-amber-500 text-neutral-950 text-xs font-bold px-2.5 py-1 rounded-xl"
            >
              + Add Staff
            </button>
          </div>

          <div className="space-y-2.5">
            {barbersList.map((barber, idx) => (
              <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400 font-semibold">Specialist #{idx + 1}</span>
                  {barbersList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBarberField(idx)}
                      className="text-red-400 text-xs font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Staff / Stylist Name"
                    value={barber.name}
                    onChange={(e) => updateBarber(idx, "name", e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <select
                    value={barber.specialty}
                    onChange={(e) => updateBarber(idx, "specialty", e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    {SPECIALTIES.map((spec) => (
                      <option key={spec} value={spec} className="bg-neutral-900">
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Service Rates */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            5. Starting Service Rates (₹)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-300 block mb-1">Haircut (₹)</label>
              <input
                type="number"
                value={haircutPrice}
                onChange={(e) => setHaircutPrice(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {shopCategory !== "women" ? (
              <div>
                <label className="text-xs text-neutral-300 block mb-1">Beard Trim (₹)</label>
                <input
                  type="number"
                  value={beardPrice}
                  onChange={(e) => setBeardPrice(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-neutral-300 block mb-1">Hair Spa (₹)</label>
                <input
                  type="number"
                  value={spaPrice}
                  onChange={(e) => setSpaPrice(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-neutral-300 block mb-1">
                {shopCategory === "women" ? "Facial & Cleanup (₹)" : "Color & Dye (₹)"}
              </label>
              <input
                type="number"
                value={shopCategory === "women" ? facialPrice : colorPrice}
                onChange={(e) =>
                  shopCategory === "women"
                    ? setFacialPrice(Number(e.target.value))
                    : setColorPrice(Number(e.target.value))
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 block mb-1">
                {shopCategory === "women" ? "Eyebrows / Threading (₹)" : "Head Massage (₹)"}
              </label>
              <input
                type="number"
                value={shopCategory === "women" ? 60 : massagePrice}
                onChange={(e) => setMassagePrice(Number(e.target.value))}
                disabled={shopCategory === "women"}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-3.5 rounded-2xl text-sm transition shadow-lg shadow-amber-500/10"
        >
          {isSubmitting ? "Registering Shop..." : "Complete & Open Dashboard 🚀"}
        </button>
      </form>
    </div>
  );
}
