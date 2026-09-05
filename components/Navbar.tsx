"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";

export default function Navbar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const saved = localStorage.getItem("customer_user_email");
    if (saved) {
      setManualEmail(saved);
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setCurrentUser(user);
          localStorage.setItem("customer_user_email", user.email || "");
        } else {
          setCurrentUser(null);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.log("Firebase auth listener note:", e);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setShowEmailModal(true);
    }
  };

  const handleManualEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail) return;
    localStorage.setItem("customer_user_email", manualEmail);
    setShowEmailModal(false);
    window.location.reload();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    localStorage.removeItem("customer_user_email");
    setCurrentUser(null);
    setManualEmail("");
    window.location.reload();
  };

  const activeEmail = isMounted
    ? currentUser?.email || (typeof window !== "undefined" ? localStorage.getItem("customer_user_email") : null)
    : null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 max-w-lg mx-auto flex items-center justify-between">
        <div onClick={() => router.push("/")} className="cursor-pointer">
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">
            Barber Marketplace
          </span>
          <span className="text-base font-black text-white">Cut & Style Hub</span>
        </div>

        <div className="flex items-center gap-2">
          {!isMounted ? (
            <div className="h-8 w-20 bg-neutral-900 animate-pulse rounded-xl" />
          ) : activeEmail ? (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center font-bold text-[10px]">
                {activeEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-[11px] text-neutral-300 max-w-[90px] truncate">
                {activeEmail.split("@")[0]}
              </span>
              <button
                onClick={handleSignOut}
                className="text-[10px] text-red-400 hover:text-red-300 font-semibold ml-1"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowEmailModal(true)}
                className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-xl font-medium"
              >
                Sign In
              </button>
              <button
                onClick={handleGoogleSignIn}
                className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3 py-1.5 rounded-xl shadow-md shadow-amber-500/10 transition"
              >
                Google 🚀
              </button>
            </div>
          )}
        </div>
      </header>

      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl w-full max-w-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Customer Sign In</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-neutral-500 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Enter your email to receive appointment reminders and live WhatsApp alerts.
            </p>

            <form onSubmit={handleManualEmailLogin} className="space-y-3">
              <input
                type="email"
                placeholder="name@example.com"
                required
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Continue with Email
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
