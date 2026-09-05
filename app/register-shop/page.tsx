"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";

export default function RegisterShopPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [category, setCategory] = useState<"men" | "women" | "unisex">("unisex");
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Live GPS Location Tracker
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Aapke device me Geolocation support nahi hai. Kripya manually link dalein.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const generatedLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setMapLink(generatedLink);
        setGettingLocation(false);
        alert(`Location detected successfully!\nCoords: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (error) => {
        setGettingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert("Location access denied! Phone settings me browser ko location permission dein.");
        } else {
          alert("Location detect karne me samasya aayi: " + error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapLink) {
      alert("Kripya live GPS location detect karein ya map link add karein.");
      return;
    }

    setSubmitting(true);
    const email = auth.currentUser?.email || localStorage.getItem("customer_user_email") || "guest@unisaloon.com";

    const { error } = await supabase.from("shops").insert([
      {
        name,
        address,
        city,
        phone,
        map_link: mapLink,
        category,
        owner_email: email.trim().toLowerCase(),
        is_open: true,
        is_verified: false,
        rating: 5.0
      }
    ]);

    setSubmitting(false);

    if (!error) {
      setShowSuccessModal(true);
    } else {
      alert("Registration failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 max-w-lg mx-auto p-4 pb-20 font-sans">
      {/* 24-HOUR VERIFICATION NOTICE MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl w-full max-w-sm text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl">
              ⏳
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">Registration Received!</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Thank you for listing <strong className="text-amber-400">{name}</strong> on UNI saloon.
              </p>
              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-[11px] text-neutral-400 text-left space-y-1">
                <p>• <strong>Location Verification:</strong> Our administrative team will inspect your physical salon address and GPS coordinates.</p>
                <p>• <strong>Review Window:</strong> Verification typically takes up to <strong>24 hours</strong>.</p>
                <p>• <strong>Go Live:</strong> Once approved, your studio will be published on the marketplace.</p>
              </div>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
        <button onClick={() => router.push("/")} className="text-xs text-neutral-400 hover:text-white">
          ← Back
        </button>
        <span className="text-xs font-bold text-amber-500 uppercase">Register New Salon</span>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-neutral-300 block mb-1">Salon / Studio Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Vintage Cuts & Grooming"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-neutral-300 block mb-1">Category *</label>
          <div className="grid grid-cols-3 gap-2">
            {(["men", "women", "unisex"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                  category === cat
                    ? "bg-amber-500 text-neutral-950"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-neutral-300 block mb-1">Full Physical Address *</label>
          <input
            type="text"
            required
            placeholder="Shop No., Landmark, Street area..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">City *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sinnar, Nashik"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* GPS LIVE LOCATION SECTION */}
        <div className="space-y-2 p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-400 block">
              📍 GPS Location Verification *
            </label>
            {mapLink && (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ✓ Location Tagged
              </span>
            )}
          </div>
          
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Dukan me khade hokar niche diye button ko dabayein taaki exact live GPS location capture ho sake.
          </p>

          <button
            type="button"
            onClick={handleGetLiveLocation}
            disabled={gettingLocation}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {gettingLocation ? "📡 Fetching GPS Location..." : "📍 Detect Current Shop Location"}
          </button>

          <input
            type="url"
            required
            placeholder="Live Google Maps Link yahan generate hoga..."
            value={mapLink}
            onChange={(e) => setMapLink(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-[11px] text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
        >
          {submitting ? "Submitting for Verification..." : "Submit Studio for Verification"}
        </button>
      </form>
    </div>
  );
}
