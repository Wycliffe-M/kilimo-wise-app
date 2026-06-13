import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AI_MODEL = "google/gemini-3-flash-preview";

const Input = z.object({
  name: z.string().min(1),
  county: z.string().min(1),
  crop: z.string().min(1),
  acres: z.number().positive().max(10000, "Please enter a realistic farm size (max 10,000 acres)"),
  water: z.string().min(1),
});

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are a Senior East African Agronomist and Rural Finance Expert specializing in Kenyan micro-climates and SACCO liquidity cycles.
Ground every recommendation in: Long Rains (Mar-May) and Short Rains (Oct-Dec) seasons; the maturity duration of the specified crop; real Kenyan market trade realities (NCPB, Wakulima, Marikiti); transportation overheads to hubs like Nairobi; and price fluctuations.
Always quote costs/prices in KES and land in Acres. Be concrete, original, and narrative-driven. Do NOT assume the farmer has a smartphone or high-bandwidth connectivity.
Respond with STRICT JSON only — no markdown fences, no preamble — matching:
{"timeline": string, "water": string, "market": string}
Each field is markdown-formatted advice (headings, lists allowed inside the string).`;

    const user = `Farmer: ${data.name}
County: ${data.county}
Crop: ${data.crop}
Land Size: ${data.acres} Acres
Primary Water Source: ${data.water}

Produce three sections:
1) "timeline": a week-by-week climate-smart calendar (land prep, nursery, transplanting, weeding, top-dressing, harvest) for this county and crop.
2) "water": targeted irrigation, mulching and water-harvesting advice optimized for the ${data.water} water source on ${data.acres} acres.
3) "market": financial roadmap — projected harvest window, expected KES/kg ranges, warnings about middleman/broker exploitation, and Chama/SACCO savings strategies.`;

    const { text } = await generateText({
      model: gateway(AI_MODEL),
      system,
      prompt: user,
      maxOutputTokens: 8192,
    });

    const parsed = extractJson(text);
    if (!parsed || typeof parsed !== "object") {
      console.error("AI raw output (unparseable):", text);
      throw new Error("The AI returned an unexpected format. Please try again.");
    }
    const p = parsed as Record<string, unknown>;
    return {
      timeline: String(p.timeline ?? ""),
      water: String(p.water ?? ""),
      market: String(p.market ?? ""),
    };
  });

function extractJson(raw: string): unknown {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = s.search(/[{[]/);
  if (start === -1) return null;
  const openCh = s[start];
  const closeCh = openCh === "{" ? "}" : "]";
  const end = s.lastIndexOf(closeCh);
  if (end <= start) return null;
  s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    const fixed = s.replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x1F\x7F]/g, " ");
    try { return JSON.parse(fixed); } catch { return null; }
  }
}
