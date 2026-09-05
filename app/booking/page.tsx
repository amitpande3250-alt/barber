"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Service {
  id: string;
  title: string;
  price: number;
  duration_minutes: number;
  category?: string; // "men" | "women"
}

// Fallback services agar database me category add na ho abhi
const defaultServices: Service[] = [
  // Men's Services
  { id: "m-haircut", title: "Classic Haircut & Styling", price: 150, duration_minutes: 25, category: "men" },
  { id: "m-beard", title: "Beard Trim & Shape", price: 100, duration_minutes: 15, category: "men" },
  { id: "m-combo", title: "Haircut + Beard Styling", price: 220, duration_minutes: 35, category: "men" },
  { id: "m-facial", title: "Charcoal Face Cleanup", price: 250, duration_minutes: 20, category: "men" },

  // Women's Services
  { id: "w-haircut", title: "Haircut, Layering & Blowdry", price: 400, duration_minutes: 35, category: "women" },
  { id: "w-spa", title: "Deep Nourishing Hair Spa", price: 799, duration_minutes: 45, category: "women" },
  { id: "w-eyebrows", title: "Threading & Eyebrows", price: 60, duration_minutes: 10, category: "women" },
  { id: "w-facial", title: "Fruit Glow Facial & Cleanup", price: 599, duration_minutes: 40, category: "women" },
  { id: "w-waxing", title: "Arms & Legs Waxing", price: 450, duration_minutes: 30, category: "women" },
];

export default function CustomerBooking() {
  const [category, setCategory] = useState<"men" | "women">("men");
  const [services, setServices] = useState<Service[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadServices() {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("price", { ascending: true });

      if (!error && data && data.length > 0) {
        // Agar database services me category nahi hai, unko default 'men' de do
        const mapped = data.map((s: any) => ({
          ...s,
          category: s.category || "men",
        }));
        // Aur default women services merge kar do agar database me abhi women services nahi hain
        const hasWomen = mapped.some((s: Service) => s.category === "women");
        if (!hasWomen) {
          setServices([...mapped, ...defaultServices.filter((s) => s.category === "women")]);
        } else {
          setServices(mapped);
        }
      } else {
        setServices(defaultServices);
      }
    }
    loadServices();
  }, []);

  // Category switch hone par list filter karo aur pehla item select karo
  const filteredServices = services.filter((s) => s.category === category);

  useEffect(() => {
    if (filteredServices.length > 0) {
      setSelectedService(filteredServices[0].id);
    } else {
      setSelectedService("");
    }
  }, [category, services]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg(false);

    if (!slotDate || !slotTime) {
      setErrorMsg("Please choose date and time slot");
      setLoading(false);
      return;
    }

    try {
      const dummyId = crypto.randomUUID();
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      let customerId = existingProfile?.id;

      if (!customerId) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: dummyId,
            full_name: fullName,
            phone: phone,
            role: "customer",
          });

        if (profileError) throw profileError;
        customerId = dummyId;
      }

      const appointmentDateTime = new Date(`${slotDate}T${slotTime}:00Z`).toISOString();

      const { error: apptError } = await supabase.from("appointments").insert({
        customer_id: customerId,
        service_id: selectedService,
        start_time: appointmentDateTime,
        status: "pending",
      });

      if (apptError) throw apptError;

      setSuccessMsg(true);
      setFullName("");
      setPhone("");
      setSlotDate("");
      setSlotTime("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="mb-6">
          <span className="text-xs uppercase tracking-widest text-amber-500 font-semibold">
            Reserve Your Chair
          </span>
          <h1 className="text-2xl font-bold mt-1">Book an Appointment</h1>
          <p className="text-neutral-400 text-xs mt-1">
            Pick your category, service & preferred schedule
          </p>
        </div>

        {/* Category Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setCategory("men")}
            className={`py-2.5 rounded-xl font-medium text-xs transition flex items-center justify-center space-x-2 ${
              category === "men"
                ? "bg-amber-500 text-neutral-950 font-bold shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>✂️</span>
            <span>Men / Gents</span>
          </button>
          <button
            type="button"
            onClick={() => setCategory("women")}
            className={`py-2.5 rounded-xl font-medium text-xs transition flex items-center justify-center space-x-2 ${
              category === "women"
                ? "bg-pink-500 text-neutral-950 font-bold shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span>🌸</span>
            <span>Women / Salon</span>
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-4 rounded-xl mb-5">
            Booking confirmed! The salon console has received your slot.
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl mb-5">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleBooking} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs text-neutral-400 mb-1 font-medium">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aditi Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1 font-medium">
              Phone Number
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1 font-medium">
              Select Service ({category === "men" ? "Gents" : "Ladies"})
            </label>
            <div className="space-y-2">
              {filteredServices.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                    selectedService === svc.id
                      ? category === "men"
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-pink-500 bg-pink-500/10"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="service"
                      value={svc.id}
                      checked={selectedService === svc.id}
                      onChange={() => setSelectedService(svc.id)}
                      className={category === "men" ? "accent-amber-500" : "accent-pink-500"}
                    />
                    <div>
                      <p className="font-semibold text-neutral-200">{svc.title}</p>
                      <p className="text-xs text-neutral-500">{svc.duration_minutes} mins</p>
                    </div>
                  </div>
                  <span className={`font-bold ${category === "men" ? "text-amber-400" : "text-pink-400"}`}>
                    ₹{svc.price}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">
                Select Date
              </label>
              <input
                type="date"
                required
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-neutral-200"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">
                Select Time
              </label>
              <input
                type="time"
                required
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-neutral-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-4 font-semibold py-3 rounded-xl transition duration-200 text-sm disabled:opacity-50 text-neutral-950 ${
              category === "men" ? "bg-amber-500 hover:bg-amber-400" : "bg-pink-500 hover:bg-pink-400 text-white"
            }`}
          >
            {loading ? "Confirming Slot..." : "Book Appointment"}
          </button>
        </form>
      </div>
    </div>
  );
}
