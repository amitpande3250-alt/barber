import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;

    if (!token || token.includes("r8_d2SALE0HtaT9cHJGd3Lbg7kfecJ2JAn1q1gTi")) {
      console.error("Missing valid REPLICATE_API_TOKEN");
      return NextResponse.json(
        { error: "Replicate token is missing or not set in environment." },
        { status: 401 }
      );
    }

    const { imageBase64, maskBase64, stylePrompt } = await req.json();

    if (!imageBase64 || !maskBase64) {
      return NextResponse.json(
        { error: "Image and mask payload required" },
        { status: 400 }
      );
    }

    console.log("--> Dispatching inpainting job to Replicate for:", stylePrompt);

    // 1. Submit prediction asynchronously (No "Prefer: wait" to avoid 504 timeouts)
    const initRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "cbfba3de42c9293fb40e994b76e8cdab82cb1e0fae85dd7239e4fe88e1438a01",
        input: {
          image: imageBase64,
          mask: maskBase64,
          prompt: `close up photorealistic portrait, sharp clean ${stylePrompt}, realistic fine hair texture, natural hairline blend`,
          negative_prompt: "blurry, low quality, cartoon, bad anatomy, deformed forehead, bald spots",
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }),
    });

    const initData = await initRes.json();

    if (!initRes.ok || initData.error) {
      console.error("Replicate Init Error:", initData.error || initData);
      return NextResponse.json(
        { error: initData.error || `Replicate returned status ${initRes.status}` },
        { status: initRes.status }
      );
    }

    const pollUrl = initData.urls?.get;
    if (!pollUrl) {
      return NextResponse.json({ error: "No polling URL returned by Replicate" }, { status: 500 });
    }

    console.log("--> Prediction queued with ID:", initData.id);

    // 2. Poll status till succeeded or failed
    let finalOutput = null;
    let attempts = 0;

    while (attempts < 35) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      attempts++;

      const checkRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkData = await checkRes.json();

      console.log(`--> Poll attempt ${attempts}: status is "${checkData.status}"`);

      if (checkData.status === "succeeded") {
        finalOutput = Array.isArray(checkData.output) ? checkData.output[0] : checkData.output;
        break;
      }

      if (checkData.status === "failed" || checkData.status === "canceled") {
        console.error("Prediction failed:", checkData.error);
        return NextResponse.json(
          { error: checkData.error || "Model processing failed on Replicate" },
          { status: 500 }
        );
      }
    }

    if (!finalOutput) {
      return NextResponse.json(
        { error: "Model processing took too long (Timed out)." },
        { status: 504 }
      );
    }

    console.log("--> Hair inpainting completed successfully!");
    return NextResponse.json({ result: finalOutput });
  } catch (err: any) {
    console.error("Route Crash:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to contact Replicate API" },
      { status: 500 }
    );
  }
}
