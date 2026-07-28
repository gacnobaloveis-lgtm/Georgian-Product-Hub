import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Compass, Share2, Hourglass, Fish as FishIcon, Clock, Bug, Droplets, Moon, Thermometer, Gauge, Lock, UserCircle, Wind, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";
import mountainSceneBg from "@assets/mountain-scene-bg.webp";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0.65)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: typeof window !== "undefined" && window.innerWidth >= 768 ? "fixed" : "scroll",
};

interface FishInfo {
  name: string;
  latin: string;
  desc: string;
  best_time: string;
  bait: string;
  lure: string;
  color: string;
  image: string;
}

interface WaterInfo {
  name: string;
  region: string;
}

interface WaterSuggestion {
  name: string;
  region: string;
  lat: number;
  lon: number;
  known: boolean;
}

interface WeekDay {
  date: string;
  day: string;
  weather_code: number;
  temp_max: number;
  temp_min: number;
  wind_max: number;
  precip_prob: number;
}

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

interface GuideData {
  fish: Record<string, FishInfo>;
  waters: { rivers: WaterInfo[]; lakes: WaterInfo[] };
}

interface ForecastResult {
  percent: number;
  explanations: string[];
  recommendation: string;
  best_time: string;
  bait: string;
  fish: FishInfo;
  weather: {
    temp: number;
    pressure: number;
    temp_max: number;
    temp_min: number;
    wind_max: number;
    hourly: { hour: string; wind: number; precip: number }[];
  };
  week?: WeekDay[];
  moon_name: string;
  water_clarity: { status: string; percent: number; explanation: string };
  date: string;
  water: WaterInfo;
}

const DAY_OPTIONS = [
  { value: 0, label: "დღეს" },
  { value: 1, label: "ხვალ" },
  { value: 2, label: "ზეგ" },
  { value: 3, label: "+3 დღე" },
  { value: 4, label: "+4 დღე" },
  { value: 5, label: "+5 დღე" },
];

function boldify(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>));
}

function percentColor(p: number) {
  if (p >= 80) return "text-emerald-300";
  if (p >= 60) return "text-lime-300";
  if (p >= 40) return "text-amber-300";
  return "text-red-300";
}

function ringColor(p: number) {
  if (p >= 80) return "#34d399";
  if (p >= 60) return "#a3e635";
  if (p >= 40) return "#fbbf24";
  return "#f87171";
}

export default function GuidePage() {
  const [, setLocation] = useLocation();
  const search = useSearch();

  const [data, setData] = useState<GuideData | null>(null);
  const [fishKey, setFishKey] = useState("");
  const [waterName, setWaterName] = useState("");
  const [waterQuery, setWaterQuery] = useState("");
  const [waterSuggestions, setWaterSuggestions] = useState<WaterSuggestion[]>([]);
  const [selectedWater, setSelectedWater] = useState<WaterSuggestion | null>(null);
  const [searchingWater, setSearchingWater] = useState(false);
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [noFishMsg, setNoFishMsg] = useState("");
  const [sharedVisit, setSharedVisit] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { isRealUser, isLoading: authLoading } = useAuth();

  useEffect(() => {
    fetch("/api/guide/data")
      .then((r) => r.json())
      .then((d: GuideData) => {
        setData(d);
        // shared-link params (?fish=..&water=..&days=..)
        const params = new URLSearchParams(search);
        const f = params.get("fish");
        const w = params.get("water");
        const dd = params.get("days");
        if (f && d.fish[f]) setFishKey(f);
        const plat = Number(params.get("lat"));
        const plon = Number(params.get("lon"));
        const pregion = params.get("region") || "";
        let sw: WaterSuggestion | null = null;
        if (w) {
          setWaterName(w);
          if (isFinite(plat) && isFinite(plon) && params.get("lat")) {
            sw = { name: w, region: pregion, lat: plat, lon: plon, known: false };
            setSelectedWater(sw);
            setWaterQuery(pregion ? `${w} (${pregion})` : w);
          } else {
            setWaterQuery(w);
          }
        }
        if (dd !== null && !isNaN(Number(dd))) setDays(Math.min(5, Math.max(0, Number(dd))));
        if (f && d.fish[f] && w) {
          setSharedVisit(true);
          void runForecast(f, w, dd !== null ? Number(dd) : 1, sw);
        }
      })
      .catch(() => setError("მონაცემები ვერ ჩაიტვირთა"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ადგილის ძებნა (debounce 350ms)
  useEffect(() => {
    if (selectedWater || waterQuery.trim().length < 2) {
      setWaterSuggestions([]);
      setSearchingWater(false);
      return;
    }
    setSearchingWater(true);
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/guide/water-search?q=${encodeURIComponent(waterQuery.trim())}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          if (!controller.signal.aborted) setWaterSuggestions(d?.results || []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setWaterSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchingWater(false);
        });
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waterQuery, selectedWater]);

  async function runForecast(f = fishKey, w = waterName, d = days, sw: WaterSuggestion | null = selectedWater) {
    if (!f || !w) {
      setError("აირჩიე თევზი და ჩაწერე ადგილი");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setNoFishMsg("");
    try {
      const extra = sw && !sw.known ? { lat: sw.lat, lon: sw.lon, region: sw.region } : {};
      const r = await fetch("/api/guide/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fish: f, water: w, days: d, ...extra }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || "შეცდომა");
      if (json?.no_fish) {
        setNoFishMsg(json.message || "ამ წყალში ეს თევზი არ ბინადრობს.");
        return;
      }
      setResult(json);
    } catch (e: any) {
      setError(e?.message || "პროგნოზი ვერ გამოითვალა");
    } finally {
      setLoading(false);
    }
  }

  function shareOnFacebook() {
    if (!result || !fishKey || !waterName) return;
    const custom =
      selectedWater && !selectedWater.known
        ? `&lat=${selectedWater.lat}&lon=${selectedWater.lon}&region=${encodeURIComponent(selectedWater.region)}`
        : "";
    const url = `${window.location.origin}/guide?fish=${encodeURIComponent(fishKey)}&water=${encodeURIComponent(waterName)}&days=${days}${custom}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "width=626,height=436"
    );
  }

  const cardCls = "rounded-2xl border border-white/20 bg-white/25 p-5 shadow-xl backdrop-blur-md";
  const labelCls = "mb-1.5 block text-sm font-semibold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]";
  const selectCls =
    "w-full rounded-lg border border-white/30 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400";

  return (
    <div className="min-h-screen" style={PAGE_BG_STYLE}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => setLocation("/")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-emerald-100/80 hover:text-white transition-colors"
          data-testid="button-back-guide"
        >
          <ArrowLeft className="h-4 w-4" />
          მთავარი
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/20 p-3 ring-1 ring-emerald-400/40 backdrop-blur-md">
            <Compass className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">მეთევზის გზამკვლევი</h1>
            <p className="text-sm text-emerald-100/80 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
              თევზის აქტივობის პროგნოზი — ამინდი, წნევა, მთვარე და წყლის გამჭვირვალობა
            </p>
          </div>
        </div>

        {/* ფორმა */}
        <div className={cardCls}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>თევზი</label>
              <select value={fishKey} onChange={(e) => setFishKey(e.target.value)} className={selectCls} data-testid="select-guide-fish">
                <option className="bg-slate-800 text-white" value="">— აირჩიე თევზი —</option>
                {data &&
                  Object.entries(data.fish).map(([k, f]) => (
                    <option className="bg-slate-800 text-white" key={k} value={k}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="relative">
              <label className={labelCls}>მდინარე / ტბა / წყალსაცავი</label>
              <input
                type="text"
                value={waterQuery}
                onChange={(e) => {
                  setWaterQuery(e.target.value);
                  setSelectedWater(null);
                  setWaterName("");
                }}
                placeholder="ჩაწერე ადგილის სახელი (მაგ. რიონი)"
                className={selectCls}
                autoComplete="off"
                data-testid="input-guide-water"
              />
              {searchingWater && (
                <p className="mt-1 text-xs text-emerald-100/70 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">ეძებს...</p>
              )}
              {waterSuggestions.length > 0 && !selectedWater && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-white/25 bg-slate-900/95 shadow-2xl backdrop-blur-md">
                  {waterSuggestions.map((w, i) => (
                    <button
                      key={`${w.name}-${w.region}-${i}`}
                      onClick={() => {
                        setSelectedWater(w);
                        setWaterName(w.name);
                        setWaterQuery(w.region ? `${w.name} (${w.region})` : w.name);
                        setWaterSuggestions([]);
                      }}
                      className="block w-full px-3 py-2.5 text-left text-sm text-white hover:bg-emerald-500/20"
                      data-testid={`suggestion-water-${i}`}
                    >
                      {w.name}
                      {w.region && <span className="ml-1.5 text-xs text-emerald-200/80">({w.region})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className={labelCls}>დღე</label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDays(d.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    days === d.value
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-900/60 text-emerald-100/80 hover:bg-slate-900/80"
                  }`}
                  data-testid={`button-guide-day-${d.value}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {data && fishKey && (
            <div className="mt-4 flex items-start gap-3">
              <img
                src={data.fish[fishKey].image}
                alt={data.fish[fishKey].name}
                className="h-20 w-20 shrink-0 rounded-xl border border-white/25 object-cover shadow-lg"
                data-testid="img-guide-fish"
              />
              <div>
                <p className="text-sm leading-6 text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
                  <FishIcon className="mr-1.5 inline h-4 w-4 text-emerald-300" />
                  {data.fish[fishKey].desc}
                </p>
                {data.fish[fishKey].lure && (
                  <p className="mt-1.5 text-sm leading-6 text-amber-200 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]" data-testid="text-guide-lure">
                    🎣 სატყუარა: {data.fish[fishKey].lure}
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={() => runForecast()}
            disabled={loading || !fishKey || !waterName}
            className="mt-5 w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
            data-testid="button-guide-forecast"
          >
            {loading ? <Hourglass className="h-4 w-4 animate-hourglass-flip" /> : <Compass className="h-4 w-4" />}
            {loading ? "ეძებს და იტვირთება..." : "გამოთვალე პროგნოზი"}
          </Button>
          {error && <p className="mt-3 text-sm font-medium text-red-300">{error}</p>}
        </div>

        {/* გაზიარებული ბმულით მოსული უავტორიზაციო ვიზიტორი */}
        {sharedVisit && !authLoading && !isRealUser && (
          <div className={`${cardCls} mt-6 text-center`}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/40">
              <Lock className="h-6 w-6 text-emerald-300" />
            </div>
            <p className="text-base font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
              სანახავად აუცილებელია საიტზე ავტორიზაცია
            </p>
            <p className="mt-1.5 text-sm text-emerald-100/80 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
              გაიარე ავტორიზაცია და ნახავ, როგორი აქტივობა იქნება — პროგნოზი დეტალური ახსნებით.
            </p>
            <Button
              onClick={() => setLoginOpen(true)}
              className="mt-4 w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              data-testid="button-guide-login"
            >
              <UserCircle className="h-4 w-4" />
              ავტორიზაცია
            </Button>
          </div>
        )}

        {/* თევზი ამ წყალში არ ბინადრობს */}
        {noFishMsg && (
          <div className={`${cardCls} mt-6 text-center`} data-testid="card-guide-no-fish">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-400/40">
              <FishIcon className="h-6 w-6 text-amber-300" />
            </div>
            <p className="text-base font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">{noFishMsg}</p>
            <p className="mt-1.5 text-sm text-emerald-100/80 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
              აირჩიე სხვა ადგილი ან სხვა თევზი და სცადე ხელახლა.
            </p>
          </div>
        )}

        {/* შედეგი */}
        {result && !(sharedVisit && !isRealUser) && (
          <div className="mt-6 space-y-4">
            <div className={`${cardCls} text-center`}>
              <img
                src={result.fish.image}
                alt={result.fish.name}
                className="mx-auto mb-3 h-24 w-24 rounded-full border-2 border-emerald-400/50 object-cover shadow-lg"
                data-testid="img-guide-result-fish"
              />
              <p className="text-sm text-emerald-100/80 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
                {result.fish.name} • {result.water.name} • {result.date}
              </p>
              {result.fish.lure && (
                <p className="mt-1 text-sm text-amber-200 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]" data-testid="text-guide-result-lure">
                  🎣 სატყუარა: {result.fish.lure}
                </p>
              )}
              <div className="relative mx-auto my-4 h-36 w-36">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={ringColor(result.percent)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.percent / 100) * 326.7} 326.7`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-extrabold ${percentColor(result.percent)} [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]`} data-testid="text-guide-percent">
                    {result.percent}%
                  </span>
                  <span className="text-xs text-emerald-100/80">კენკვის შანსი</span>
                </div>
              </div>
              <p className="text-[15px] font-semibold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">{result.recommendation}</p>

              <Button
                onClick={shareOnFacebook}
                className="mt-5 w-full gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold"
                data-testid="button-guide-share"
              >
                <Share2 className="h-4 w-4" />
                გააზიარე Facebook-ზე
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={`${cardCls} !p-4 text-center`}>
                <Thermometer className="mx-auto mb-1.5 h-5 w-5 text-sky-300" />
                <p className="text-xs text-emerald-100/80">ტემპერატურა</p>
                <p className="font-bold text-white">{result.weather.temp}°C</p>
              </div>
              <div className={`${cardCls} !p-4 text-center`}>
                <Gauge className="mx-auto mb-1.5 h-5 w-5 text-amber-300" />
                <p className="text-xs text-emerald-100/80">წნევა</p>
                <p className="font-bold text-white">{result.weather.pressure} hPa</p>
              </div>
              <div className={`${cardCls} !p-4 text-center`}>
                <Moon className="mx-auto mb-1.5 h-5 w-5 text-violet-300" />
                <p className="text-xs text-emerald-100/80">მთვარე</p>
                <p className="text-sm font-bold text-white leading-tight">{result.moon_name}</p>
              </div>
              <div className={`${cardCls} !p-4 text-center`}>
                <Droplets className="mx-auto mb-1.5 h-5 w-5 text-cyan-300" />
                <p className="text-xs text-emerald-100/80">გამჭვირვალობა</p>
                <p className="text-sm font-bold text-white leading-tight">{result.water_clarity.status}</p>
              </div>
            </div>

            {result.week && result.week.length > 0 && (
              <div className={cardCls}>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
                  <CloudRain className="h-4 w-4 text-sky-300" />
                  ამინდი კვირის განმავლობაში
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {result.week.map((w) => {
                    const active = w.date === result.date;
                    const [dayName, ...dateParts] = w.day.split(", ");
                    return (
                      <div
                        key={w.date}
                        className={`flex min-w-[88px] flex-1 flex-col items-center rounded-2xl px-2 py-3 text-center ${
                          active
                            ? "border border-cyan-400/80 bg-slate-900/90 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                            : "border border-white/5 bg-slate-900/70"
                        }`}
                        data-testid={`week-${w.date}`}
                      >
                        <p className={`text-[13px] font-extrabold uppercase tracking-wide ${active ? "text-cyan-300" : "text-slate-200"}`}>
                          {dayName}
                        </p>
                        <p className="text-[10px] text-slate-400">{dateParts.join(", ")}</p>
                        <p className="my-1.5 text-3xl leading-none">{weatherEmoji(w.weather_code)}</p>
                        <p className="text-xl font-extrabold text-white leading-tight">{w.temp_max}°</p>
                        <p className="text-sm font-bold text-cyan-300/90 leading-tight">{w.temp_min}°</p>
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-300">
                          <Wind className="h-3 w-3 text-sky-300" />
                          {w.wind_max} <span className="text-slate-400">კმ/სთ</span>
                        </p>
                        <p className={`mt-1 flex items-center gap-1 text-[11px] ${w.precip_prob > 0 ? "text-cyan-300" : "text-slate-400"}`}>
                          <Droplets className="h-3 w-3" />
                          {w.precip_prob}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={cardCls}>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <p className="flex items-center gap-2 text-sm text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
                  <Clock className="h-4 w-4 shrink-0 text-emerald-300" />
                  <span><strong>საუკეთესო დრო:</strong> {result.best_time}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
                  <Bug className="h-4 w-4 shrink-0 text-amber-300" />
                  <span><strong>სატყუარა:</strong> {result.bait}</span>
                </p>
              </div>
              <hr className="my-3 border-white/20" />
              <ul className="space-y-2">
                {result.explanations.map((ex, i) => (
                  <li key={i} className="text-sm leading-6 text-emerald-50 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
                    {boldify(ex)}
                  </li>
                ))}
                <li className="text-sm leading-6 text-emerald-50/90 [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
                  💧 {result.water_clarity.explanation}
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
      <AuthLoginDialog open={loginOpen} onOpenChange={setLoginOpen} onRegistered={() => setLoginOpen(false)} />
    </div>
  );
}
