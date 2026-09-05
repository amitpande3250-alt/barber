"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STYLES = [
  { id: "buzz", name: "Military Buzz Cut", prompt: "clean military buzz cut, short textured buzz" },
  { id: "fade", name: "Skin Fade", prompt: "high skin fade with sharp textured hair on top" },
  { id: "crop", name: "French Crop", prompt: "textured french crop with straight neat fringe" },
  { id: "pompadour", name: "Pompadour", prompt: "classic modern pompadour volume hairstyle" },
];

export default function HairstyleInpaintStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [inpaintResult, setInpaintResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!capturedPhoto) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "user", width: 512, height: 512 } })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error("Camera error:", err));
    }
  }, [capturedPhoto]);

  const captureSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(512, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, 512, 512);

    const base64 = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(base64);
  };

  const createHairMask = (): string => {
    // Generate precise hair-region mask (White = replace hair, Black = preserve 100% face)
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = 512;
    maskCanvas.height = 512;
    const mCtx = maskCanvas.getContext("2d");
    if (!mCtx) return "";

    // Fill completely black (preserve face & background)
    mCtx.fillStyle = "#000000";
    mCtx.fillRect(0, 0, 512, 512);

    // Draw white zone ONLY over top of head & temples
    mCtx.fillStyle = "#FFFFFF";
    mCtx.beginPath();
    mCtx.moveTo(512 * 0.18, 512 * 0.44);
    mCtx.bezierCurveTo(512 * 0.12, 512 * 0.05, 512 * 0.88, 512 * 0.05, 512 * 0.82, 512 * 0.44);
    mCtx.bezierCurveTo(512 * 0.72, 512 * 0.35, 512 * 0.28, 512 * 0.35, 512 * 0.18, 512 * 0.44);
    mCtx.closePath();
    mCtx.fill();

    return maskCanvas.toDataURL("image/png");
  };

  const runHairInpainting = async () => {
    if (!capturedPhoto) return;
    setIsProcessing(true);
    setErrorMsg("");

    const hairMaskBase64 = createHairMask();

    try {
      const res = await fetch("/api/ai-hairstyle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: capturedPhoto,
          maskBase64: hairMaskBase64,
          stylePrompt: selectedStyle.prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Inpainting failed");

      setInpaintResult(data.result);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process hairstyle");
    } finally {
      setIsProcessing(false);
    }
  };

  const proceedToBooking = () => {
    const finalImage = inpaintResult || capturedPhoto;
    if (finalImage) {
      sessionStorage.setItem("ai_hairstyle_snapshot", finalImage);
      sessionStorage.setItem("ai_hairstyle_name", selectedStyle.name);
      router.push("/booking");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-between p-4 max-w-lg mx-auto">
      <div className="text-center pt-2">
        <span className="text-xs uppercase tracking-widest text-amber-500 font-semibold">
          AI Precision Inpainting
        </span>
        <h1 className="text-xl font-bold mt-0.5">Real-Face Hairstyle Studio</h1>
        <p className="text-xs text-neutral-400">Replaces only your hair with realistic barber cuts</p>
      </div>

      <div className="relative w-full aspect-square max-w-sm rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl flex items-center justify-center my-3">
        {inpaintResult ? (
          <img src={inpaintResult} alt="Transformed Result" className="w-full h-full object-cover" />
        ) : capturedPhoto ? (
          <img src={capturedPhoto} alt="Your Face" className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
        )}

        {!capturedPhoto && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-56 h-72 border-2 border-dashed border-amber-500/50 rounded-full"></div>
            <span className="text-[11px] text-amber-400 bg-neutral-950/80 px-3 py-1 rounded-full border border-amber-500/30 mt-3">
              Align Face Inside Oval
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-amber-400">AI Inpainting in Progress...</p>
            <p className="text-xs text-neutral-400 mt-1">Blending {selectedStyle.name} onto your head</p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl mb-3 text-center">
          {errorMsg}
        </div>
      )}

      <div className="w-full space-y-3 pb-4">
        {capturedPhoto && (
          <div className="flex gap-2 justify-center overflow-x-auto pb-1">
            {STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                  selectedStyle.id === style.id
                    ? "bg-amber-500 text-neutral-950 font-semibold"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                {style.name}
              </button>
            ))}
          </div>
        )}

        {!capturedPhoto ? (
          <button
            onClick={captureSelfie}
            className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-3.5 rounded-2xl transition duration-200 text-sm shadow-lg shadow-amber-500/10"
          >
            Capture Head Scan
          </button>
        ) : !inpaintResult ? (
          <div className="flex gap-2">
            <button
              onClick={() => setCapturedPhoto(null)}
              className="w-1/3 bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold py-3.5 rounded-2xl text-xs"
            >
              Retake
            </button>
            <button
              onClick={runHairInpainting}
              disabled={isProcessing}
              className="w-2/3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-3.5 rounded-2xl text-sm"
            >
              Apply {selectedStyle.name}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setInpaintResult(null);
                setCapturedPhoto(null);
              }}
              className="w-1/3 bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold py-3.5 rounded-2xl text-xs"
            >
              Try Another
            </button>
            <button
              onClick={proceedToBooking}
              className="w-2/3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3.5 rounded-2xl text-sm"
            >
              Book With This Haircut
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
