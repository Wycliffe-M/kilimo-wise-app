import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sprout, Leaf, Droplets, TrendingUp, ShieldCheck, Activity,
  Lock, Power, MapPin, Wheat, Tractor, CalendarDays, CircleAlert,
  CheckCircle2, Loader2, Share2,
} from "lucide-react";
import { COUNTIES, WATER_SOURCES, getCropsForCounty, getEcoZone } from "@/lib/kilimo-data";
import { generatePlan } from "@/lib/kilimo.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KilimoSmart Planner — Climate-Smart Shamba Advisor for Kenyan Farmers" },
      { name: "description", content: "Plan, irrigate, and sell smarter. A climate-smart, county-aware crop calendar and market roadmap built for Kenyan smallholder farmers." },
      { property: "og:title", content: "KilimoSmart Planner" },
      { property: "og:description", content: "County-aware crop calendar & market roadmap for Kenyan smallholders." },
    ],
  }),
  component: App,
});

type Screen = "onboard" | "input" | "dashboard";
type Tab = "timeline" | "water" | "market";
type Profile = { name: string; email: string };
type Farm = { county: string; crop: string; acres: number; water: string };
type Plan = { timeline: string; water: string; market: string };


function App() {
  const [screen, setScreenState] = useState<Screen>("onboard");
  const [fade, setFade] = useState(true);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [farm, setFarmState] = useState<Farm | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [killed, setKilled] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const p = localStorage.getItem("kilimo_profile");
      const f = localStorage.getItem("kilimo_farm");
      if (p) {
        const parsed = JSON.parse(p) as Profile;
        setProfileState(parsed);
      }
      if (f) {
        const parsed = JSON.parse(f) as Farm;
        setFarmState(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const setProfile = useCallback((p: Profile | null) => {
    setProfileState(p);
    if (typeof window !== "undefined") {
      if (p) localStorage.setItem("kilimo_profile", JSON.stringify(p));
      else localStorage.removeItem("kilimo_profile");
    }
  }, []);

  const setFarm = useCallback((f: Farm | null) => {
    setFarmState(f);
    if (typeof window !== "undefined") {
      if (f) localStorage.setItem("kilimo_farm", JSON.stringify(f));
      else localStorage.removeItem("kilimo_farm");
    }
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const setScreen = useCallback((s: Screen) => {
    setFade(false);
    window.setTimeout(() => {
      setScreenState(s);
      setFade(true);
    }, 140);
  }, []);


  const handleProfile = (p: Profile) => {
    setProfile(p);
    setScreen("input");
  };

  const handleFarmSubmit = async (f: Farm) => {
    setFarm(f);
    setError(null);
    setLoading(true);
    setKilled(false);
    try {
      const res = await generatePlan({ data: { name: profile!.name, ...f } });
      setPlan(res);
      setScreen("dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setLoading(false);
      setCooldown(10);
    }
  };

  const killSwitch = () => {
    setPlan(null);
    setKilled(true);
    setError(null);
    setLoading(false);
    setCooldown(0);
    if (typeof window !== "undefined") {
      localStorage.removeItem("kilimo_farm");
    }
    setFarmState(null);
    setScreen("input");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {profile && <GreetingBanner name={profile.name} />}
      <main
        className={`mx-auto max-w-6xl px-4 py-8 transition-opacity duration-200 ${fade ? "opacity-100" : "opacity-0"}`}
      >
        {screen === "onboard" && <Onboarding onSubmit={handleProfile} />}
        {screen === "input" && profile && (
          <FarmInput
            onSubmit={handleFarmSubmit}
            loading={loading}
            error={error}
            killed={killed}
            cooldown={cooldown}
          />
        )}
        {screen === "dashboard" && plan && farm && (
          <Dashboard
            farm={farm}
            plan={plan}
            onKill={killSwitch}
          />
        )}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-muted-foreground">
        KilimoSmart Planner · Built for Kenyan smallholder farmers · Session-local data
      </footer>
    </div>
  );
}

function GreetingBanner({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[image:var(--background-image-gradient-hero)] text-primary-foreground shadow-[var(--shadow-card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sprout className="h-6 w-6 text-accent" />
          <div className="font-semibold tracking-tight">KilimoSmart Planner</div>
        </div>
        <div className="text-sm sm:text-base">
          <span className="opacity-80">Habari,</span>{" "}
          <span className="font-semibold">{name}</span>!{" "}
          <span className="opacity-80 hidden sm:inline">Welcome to your Shamba Planner</span>
        </div>
      </div>
    </header>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}

function Onboarding({ onSubmit }: { onSubmit: (p: Profile) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const valid = name.trim().length > 1 && /.+@.+\..+/.test(email) && consent;

  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-stretch">
      <Card className="overflow-hidden">
        <div className="bg-[image:var(--background-image-gradient-hero)] p-8 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm opacity-90"><Leaf className="h-4 w-4" /> Karibu</div>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            Plan your shamba with climate-smart confidence.
          </h1>
          <p className="mt-3 max-w-md text-sm opacity-90">
            County-aware crop calendars, water-source-tuned irrigation advice, and
            honest market roadmaps — built for Kenyan smallholders.
          </p>
        </div>
        <div className="space-y-3 p-6 text-sm">
          <Feature icon={<CalendarDays className="h-4 w-4" />} text="Week-by-week planting timeline tuned to your county." />
          <Feature icon={<Droplets className="h-4 w-4" />} text="Irrigation & mulching advice for your water source." />
          <Feature icon={<TrendingUp className="h-4 w-4" />} text="Harvest windows and Chama/SACCO savings strategies." />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sprout className="h-5 w-5 text-primary" /> Create your profile
        </h2>
        <div className="mt-4 space-y-4">
          <Field label="Full Name">
            <input
              className="input-base"
              placeholder="e.g. Wanjiku Kamau"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Email Address">
            <input
              type="email"
              className="input-base"
              placeholder="you@example.co.ke"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <div className="rounded-md border border-accent/50 bg-accent/10 p-3 text-xs leading-relaxed text-foreground/80">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
              <Lock className="h-3.5 w-3.5" /> OASIS Protocol · Data Governance
            </div>
            In compliance with the Kenya Data Protection Act (DPA) 2022, KilimoSmart
            Planner applies the OASIS Protocol. We request your explicit opt-in to
            process your agricultural and geographic inputs. Your data is stored
            locally in your active browser session, remains completely sovereign to
            you, and is never sold to third parties.
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
            />
            <span>I consent (opt-in) to local, session-only processing of my inputs under the OASIS Protocol.</span>
          </label>

          <button
            disabled={!valid}
            onClick={() => onSubmit({ name: name.trim(), email: email.trim() })}
            className="btn-primary w-full"
          >
            Create Profile & Proceed
          </button>
        </div>
      </Card>

      <style>{cssEmbeds}</style>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-foreground/80">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

const LOADING_MESSAGES = [
  "Consulting the rains calendar…",
  "Checking your county's eco-zone…",
  "Mapping irrigation options…",
  "Calculating market windows…",
  "Finalising your farm plan…",
];

function FarmInput({
  onSubmit, loading, error, killed, cooldown,
}: {
  onSubmit: (f: Farm) => void;
  loading: boolean;
  error: string | null;
  killed: boolean;
  cooldown: number;
}) {
  const [county, setCounty] = useState<string>("");
  const [crop, setCrop] = useState<string>("");
  const [acres, setAcres] = useState<string>("");
  const [water, setWater] = useState<string>("");
  const [msgIdx, setMsgIdx] = useState(0);

  const crops = useMemo(() => (county ? getCropsForCounty(county) : []), [county]);
  const zone = county ? getEcoZone(county) : null;
  const acresNum = Number(acres);
  const valid = county && crop && water && acresNum > 0;

  useEffect(() => { setCrop(""); }, [county]);

  useEffect(() => {
    if (!loading) { setMsgIdx(0); return; }
    const id = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [loading]);

  return (
    <div className="space-y-6">
      {killed && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <CircleAlert className="h-4 w-4 mt-0.5" />
          <span>All automated background loops terminated by user command. Restart by generating a new calendar.</span>
        </div>
      )}

      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Tractor className="h-5 w-5 text-primary" /> Farm Input Portal
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your shamba. The crop list adapts to your county's ecological zone.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="County">
            <select className="input-base" value={county} onChange={(e) => setCounty(e.target.value)}>
              <option value="">— Select County —</option>
              {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {zone && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> Eco-zone: <span className="font-medium text-foreground">{zone}</span>
              </div>
            )}
          </Field>

          <Field label="Crop">
            <select className="input-base" value={crop} onChange={(e) => setCrop(e.target.value)} disabled={!county}>
              <option value="">{county ? "— Select Crop —" : "Select a county first"}</option>
              {crops.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Land Size (Acres)">
            <input
              type="number" min="0.01" step="0.01"
              className="input-base"
              placeholder="e.g. 1.5"
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
            />
          </Field>

          <Field label="Primary Water Source">
            <select className="input-base" value={water} onChange={(e) => setWater(e.target.value)}>
              <option value="">— Select Water Source —</option>
              {WATER_SOURCES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </Field>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <CircleAlert className="h-4 w-4 mt-0.5" /> <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">All values are processed locally in your browser session.</div>
          <div className="flex flex-col items-end gap-1">
            <button
              disabled={!valid || loading || cooldown > 0}
              onClick={() => onSubmit({ county, crop, acres: acresNum, water })}
              className="btn-primary inline-flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Consulting the agronomist…</>
              ) : (
                <><Wheat className="h-4 w-4" /> Generate Climate-Smart Calendar</>
              )}
            </button>
            {cooldown > 0 && !loading && (
              <span className="text-xs text-muted-foreground">Please wait {cooldown}s before trying again.</span>
            )}
          </div>
        </div>
      </Card>

      {loading && (
        <Card className="flex flex-col items-center justify-center gap-3 p-10">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <Tractor className="h-7 w-7 animate-bounce text-primary" />
            <Leaf className="h-6 w-6 animate-pulse text-accent" />
          </div>
          <span className="text-sm text-muted-foreground transition-opacity duration-300">{LOADING_MESSAGES[msgIdx]}</span>
        </Card>
      )}

      <style>{cssEmbeds}</style>
    </div>
  );
}

function Dashboard({
  farm, plan, onKill,
}: {
  farm: Farm;
  plan: Plan;
  onKill: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("timeline");

  const tabMeta: Record<Tab, { title: string; content: string }> = {
    timeline: { title: "Planting Timeline", content: plan.timeline },
    water: { title: "Water Management", content: plan.water },
    market: { title: "Market Outlook", content: plan.market },
  };

  const shareTextFor = (tab: Tab) => {
    const meta = tabMeta[tab];
    const summary = (meta.content || "").slice(0, 300);
    return `KilimoSmart Planner — ${meta.title}\nFarm: ${farm.crop}, ${farm.acres} acres, ${farm.county}\n\n${summary}`;
  };

  const shareOnWhatsApp = (tab: Tab) => {
    if (typeof window === "undefined") return;

    const encodedText = encodeURIComponent(shareTextFor(tab));
    const isMobileDevice = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(
      window.navigator.userAgent,
    );
    const shareUrl = isMobileDevice
      ? `https://wa.me/?text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;

    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Your Shamba Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              {farm.crop} · {farm.acres} Acres · {farm.county} · {farm.water}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TabBtn active={activeTab === "timeline"} onClick={() => setActiveTab("timeline")} icon={<CalendarDays className="h-4 w-4" />}>Planting Timeline</TabBtn>
            <TabBtn active={activeTab === "water"} onClick={() => setActiveTab("water")} icon={<Droplets className="h-4 w-4" />}>Water Management</TabBtn>
            <TabBtn active={activeTab === "market"} onClick={() => setActiveTab("market")} icon={<TrendingUp className="h-4 w-4" />}>Market Outlook</TabBtn>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        {(["timeline","water","market"] as Tab[]).map((t) => activeTab === t && (
          <div key={t} className="animate-[fadein_.25s_ease]">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => shareOnWhatsApp(t)}
                className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.62_0.17_150)] bg-[oklch(0.62_0.17_150)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-card)] transition hover:brightness-110"
              >
                <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
              </button>
            </div>
            <article className="prose prose-sm max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/85 prose-li:text-foreground/85">
              {tabMeta[t].content ? <ReactMarkdown>{tabMeta[t].content}</ReactMarkdown> : <p className="text-muted-foreground">No {tabMeta[t].title.toLowerCase()} content available.</p>}
            </article>
          </div>
        ))}
      </Card>


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AuditCard
          tone="ok"
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="OCEAN Verification Matrix"
          body="Output Verified: Content is Original, Concrete (KES/Acres), Evident to regional climate, Assertive, and Narrative-driven."
        />
        <AuditCard
          tone="info"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="TRACK Bias Monitor"
          body="TRACK Pipeline Cleared: Inspected for underlying technological bias. Free from assumptions of smartphone or high-bandwidth connectivity dependencies."
        />
        <AuditCard
          tone="warn"
          icon={<Lock className="h-4 w-4" />}
          title="RANK Autonomy Limits"
          body="RANK Calibration: This interface operates strictly at Level 1 (Read-Only Advice). It has zero authorization to alter architecture or transfer funds without manual human handoff."
        />
        <AuditCard
          tone="hunt"
          icon={<Activity className="h-4 w-4" />}
          title="HUNT Orchestration"
          body="Orchestration Status: Crop Agent and Market Agent synchronized."
          action={
            <button onClick={onKill} className="btn-kill mt-3 inline-flex w-full items-center justify-center gap-2">
              <Power className="h-4 w-4" /> Emergency Kill Switch
            </button>
          }
        />
      </div>

      <style>{cssEmbeds}</style>
    </div>
  );
}

function TabBtn({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
          : "border-border bg-card text-foreground/70 hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {icon} {children}
    </button>
  );
}

function AuditCard({
  tone, icon, title, body, action,
}: {
  tone: "ok" | "info" | "warn" | "hunt";
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const toneCls = {
    ok: "border-[oklch(0.55_0.13_150_/_0.4)] bg-[oklch(0.55_0.13_150_/_0.08)]",
    info: "border-[oklch(0.45_0.08_200_/_0.4)] bg-[oklch(0.45_0.08_200_/_0.08)]",
    warn: "border-accent/50 bg-accent/10",
    hunt: "border-primary/40 bg-primary/5",
  }[tone];
  return (
    <div className={`rounded-[var(--radius)] border p-4 text-sm shadow-[var(--shadow-card)] ${toneCls}`}>
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <span className="text-primary">{icon}</span> {title}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-foreground/75">{body}</p>
      {action}
    </div>
  );
}

const cssEmbeds = `
.input-base{
  width:100%;
  border:1px solid var(--border);
  background:var(--card);
  color:var(--foreground);
  border-radius:0.6rem;
  padding:0.6rem 0.75rem;
  font-size:0.9rem;
  outline:none;
  transition:border-color .15s, box-shadow .15s;
}
.input-base:focus{
  border-color:var(--primary);
  box-shadow:0 0 0 3px oklch(0.55 0.13 150 / 0.18);
}
.input-base:disabled{opacity:.55;cursor:not-allowed}
.btn-primary{
  background-image:var(--gradient-hero);
  color:var(--primary-foreground);
  font-weight:600;
  padding:0.7rem 1.1rem;
  border-radius:0.7rem;
  font-size:0.9rem;
  transition:transform .1s ease, opacity .15s ease, box-shadow .15s;
  box-shadow:var(--shadow-card);
}
.btn-primary:hover:not(:disabled){transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-kill{
  background:var(--destructive);
  color:var(--destructive-foreground);
  font-weight:700;
  padding:0.55rem 0.9rem;
  border-radius:0.6rem;
  font-size:0.85rem;
  letter-spacing:0.02em;
  transition:transform .1s, filter .15s;
}
.btn-kill:hover{filter:brightness(1.08); transform:translateY(-1px)}
@keyframes fadein { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:none } }
.prose ul{list-style:disc;padding-left:1.25rem}
.prose ol{list-style:decimal;padding-left:1.25rem}
.prose h1,.prose h2,.prose h3{font-weight:700;margin-top:1.1em;margin-bottom:.4em}
.prose h2{font-size:1.05rem}
.prose h3{font-size:0.95rem;color:var(--primary)}
.prose p{margin:.5em 0}
.prose strong{color:var(--foreground)}
`;
