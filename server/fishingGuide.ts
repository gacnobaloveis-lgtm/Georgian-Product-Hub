// ─────────────────────────────────────────────────────────────
// მეთევზის გზამკვლევი — თევზის აქტივობის პროგნოზის ლოგიკა
// (ამინდი: Open-Meteo, მთვარის ფაზა, წყლის გამჭვირვალობა)
// ─────────────────────────────────────────────────────────────

export interface FishInfo {
  name: string;
  latin: string;
  desc: string;
  pressure_optimal: number;
  pressure_range: number;
  temp_optimal: number;
  temp_range: number;
  moon_preferred: number[];
  active_months: number[];
  best_time: string;
  bait: string;
  color: string;
  clarity_pref: string;
}

export const FISH_DATA: Record<string, FishInfo> = {
  kashapi: {
    name: "ქაშაპი",
    latin: "Silurus glanis",
    desc: "საქართველოს უდიდესი მტაცებელი თევზი. აქტიურია ღამით, უყვარს თბილი წყალი და ნორმალური წნევა.",
    pressure_optimal: 1015,
    pressure_range: 8,
    temp_optimal: 21,
    temp_range: 5,
    moon_preferred: [0.0, 0.5],
    active_months: [4, 5, 6, 7, 8, 9, 10],
    best_time: "ღამე 00:00 – განთიადი",
    bait: "კიბორჩხალა, თევზი, ჭია",
    color: "#00d9a5",
    clarity_pref: "მღვრიე",
  },
  kalmahi: {
    name: "კალმახი",
    latin: "Salmo trutta",
    desc: "მთის მდინარეებისა და ტბების მტაცებელი. უყვარს ცივი, ჟანგბადიანი წყალი და სტაბილური ამინდი.",
    pressure_optimal: 1018,
    pressure_range: 10,
    temp_optimal: 12,
    temp_range: 6,
    moon_preferred: [0.25, 0.75],
    active_months: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    best_time: "განთიადი და დამალება",
    bait: "ბუგრი, მელის ჭია, ხელოვნური მძივები",
    color: "#38bdf8",
    clarity_pref: "წმინდა",
  },
  korchila: {
    name: "ქორჭილა",
    latin: "Esox lucius",
    desc: "აგრესიული მტაცებელი. აქტიურია სტაბილურ ამინდში, უყვარს წყალმცენარეებიანი ადგილები.",
    pressure_optimal: 1014,
    pressure_range: 9,
    temp_optimal: 16,
    temp_range: 7,
    moon_preferred: [0.0, 0.25],
    active_months: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    best_time: "დილა 5:00–9:00 და საღამო 18:00–21:00",
    bait: "ბუგრი, მბრძანებელი, ხელოვნური სატყუარა",
    color: "#f87171",
    clarity_pref: "საშუალო",
  },
  kariklapi: {
    name: "ქარიყლაპია",
    latin: "Sander lucioperca",
    desc: "ღამის მტაცებელი, აქტიურია მთვარის სინათლეზე. უყვარს ღრმა ადგილები და ნაკადულები.",
    pressure_optimal: 1016,
    pressure_range: 7,
    temp_optimal: 19,
    temp_range: 5,
    moon_preferred: [0.5, 0.75],
    active_months: [4, 5, 6, 7, 8, 9, 10],
    best_time: "ღამე 22:00–03:00",
    bait: "თევზი, ბუგრი, ჯიქურა",
    color: "#fbbf24",
    clarity_pref: "საშუალო",
  },
  shamaya: {
    name: "შამაია",
    latin: "Aspius aspius",
    desc: "სწრაფი მტაცებელი, აქტიურია დღისით და ნათელ ამინდში. უყვარს ღია წყალი და ძლიერი ნაკადი.",
    pressure_optimal: 1012,
    pressure_range: 8,
    temp_optimal: 20,
    temp_range: 6,
    moon_preferred: [0.0, 0.25, 0.75],
    active_months: [4, 5, 6, 7, 8, 9],
    best_time: "დილა 6:00–11:00 და საღამო 16:00–19:00",
    bait: "ბუგრი, მწერი, მცირე თევზი",
    color: "#a78bfa",
    clarity_pref: "წმინდა",
  },
};

export interface WaterInfo {
  name: string;
  region: string;
  lat: number;
  lon: number;
}

export const WATERS: { rivers: WaterInfo[]; lakes: WaterInfo[] } = {
  rivers: [
    { name: "მდ. მტკვარი", region: "თბილისი", lat: 41.7151, lon: 44.8271 },
    { name: "მდ. რიონი", region: "ქუთაისი", lat: 42.27, lon: 42.71 },
    { name: "მდ. ალაზანი", region: "თელავი", lat: 41.92, lon: 45.48 },
    { name: "მდ. ენგური", region: "ზუგდიდი", lat: 42.51, lon: 41.87 },
    { name: "მდ. ბზიფი", region: "ავადხარა", lat: 43.2, lon: 40.6 },
    { name: "მდ. ფსოუ", region: "გაგრა", lat: 43.28, lon: 40.27 },
    { name: "მდ. თერგი", region: "სტეფანწმინდა", lat: 42.66, lon: 44.64 },
    { name: "მდ. არაგვი", region: "მცხეთა", lat: 42.07, lon: 44.72 },
    { name: "მდ. ქსანი", region: "გორი", lat: 42.25, lon: 44.11 },
    { name: "მდ. პარავანი", region: "ფარავნის ტბა", lat: 41.45, lon: 43.88 },
    { name: "მდ. მეჯუდა", region: "მესტია", lat: 43.05, lon: 42.73 },
    { name: "მდ. ლოპოტა", region: "ლაგოდეხი", lat: 42.1, lon: 45.12 },
    { name: "მდ. ცხენისწყალი", region: "საჩხერე", lat: 42.31, lon: 43.3 },
    { name: "მდ. ყვარელი", region: "ყვარელი", lat: 41.95, lon: 45.8 },
    { name: "მდ. იორი", region: "საგარეჯო", lat: 41.82, lon: 45.33 },
    { name: "მდ. ხრამი", region: "ბორჯომი", lat: 41.84, lon: 43.38 },
    { name: "მდ. ჭოროხი", region: "ბათუმი", lat: 41.65, lon: 41.64 },
    { name: "მდ. საფსაი", region: "ოზურგეთი", lat: 41.92, lon: 42.0 },
    { name: "მდ. ნატანები", region: "ფოთი", lat: 42.15, lon: 41.67 },
    { name: "მდ. კოდორი", region: "სოხუმი", lat: 43.1, lon: 41.1 },
  ],
  lakes: [
    { name: "ფარავნის ტბა", region: "ახალციხის მხარე", lat: 41.45, lon: 43.88 },
    { name: "ბაზალეთის ტბა", region: "დუშეთი", lat: 41.76, lon: 44.67 },
    { name: "კუს ტბა", region: "თბილისი", lat: 41.65, lon: 44.78 },
    { name: "თბილისის ზღვა", region: "თბილისი", lat: 41.85, lon: 44.88 },
    { name: "ჯანდარის ტბა", region: "მარნეული", lat: 41.18, lon: 46.38 },
    { name: "ლოპოტის ტბა", region: "ლაგოდეხი", lat: 42.1, lon: 45.12 },
    { name: "ბათაბუნის ტბა", region: "ბათაბუნი", lat: 41.75, lon: 43.45 },
    { name: "თობავარჩხილის ტბა", region: "თიანეთი", lat: 42.1, lon: 44.95 },
    { name: "მადათაფის ტბა", region: "მადათაფა", lat: 42.35, lon: 42.2 },
    { name: "ქელეთბარის ტბა", region: "ქელეთბარი", lat: 42.2, lon: 42.4 },
  ],
};

export const ALL_WATERS: WaterInfo[] = [...WATERS.rivers, ...WATERS.lakes];

// ── მთვარის ფაზა ─────────────────────────────────────────────
export function getMoonPhase(date: Date): number {
  const knownNew = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - knownNew) / 86400000;
  const lunarCycle = 29.53058867;
  const phase = ((days % lunarCycle) + lunarCycle) % lunarCycle / lunarCycle;
  return phase;
}

export function moonPhaseName(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return "ახალი მთვარე";
  if (phase > 0.22 && phase < 0.28) return "პირველი მეოთხედი";
  if (phase > 0.47 && phase < 0.53) return "სრული მთვარე";
  if (phase > 0.72 && phase < 0.78) return "ბოლო მეოთხედი";
  if (phase < 0.22) return "მზარდი მთვარე";
  if (phase < 0.47) return "მზარდი (მეოთხედამდე)";
  if (phase < 0.72) return "მცირდება (სრულის შემდეგ)";
  return "მცირდება";
}

// ── ამინდი (Open-Meteo) ──────────────────────────────────────
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface WeatherInfo {
  temp: number;
  pressure: number;
  weather_code: number;
  temp_max: number;
  temp_min: number;
  precipitation: number;
  rain: number;
  showers: number;
}

export async function getWeather(lat: number, lon: number, targetDate: Date): Promise<WeatherInfo | null> {
  try {
    const d = fmtDate(targetDate);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,pressure_msl_mean,weathercode,precipitation_sum,rain_sum,showers_sum` +
      `&timezone=Asia/Tbilisi&start_date=${d}&end_date=${d}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data: any = await r.json();
    const daily = data?.daily;
    if (!daily?.time?.length) return null;
    const temp = (daily.temperature_2m_max[0] + daily.temperature_2m_min[0]) / 2;
    return {
      temp: Math.round(temp * 10) / 10,
      pressure: Math.round(daily.pressure_msl_mean[0] * 10) / 10,
      weather_code: daily.weathercode[0],
      temp_max: daily.temperature_2m_max[0],
      temp_min: daily.temperature_2m_min[0],
      precipitation: Math.round((daily.precipitation_sum?.[0] || 0) * 10) / 10,
      rain: Math.round((daily.rain_sum?.[0] || 0) * 10) / 10,
      showers: Math.round((daily.showers_sum?.[0] || 0) * 10) / 10,
    };
  } catch (e) {
    console.error("[guide] weather error:", e);
    return null;
  }
}

export interface PastPrecip {
  date: string;
  days_ago: number;
  total_mm: number;
}

export async function getPastPrecipitation(lat: number, lon: number, targetDate: Date, daysBack = 5): Promise<PastPrecip[]> {
  try {
    const start = new Date(targetDate.getTime() - daysBack * 86400000);
    const end = new Date(targetDate.getTime() - 86400000);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=precipitation_sum,rain_sum,showers_sum&timezone=Asia/Tbilisi` +
      `&start_date=${fmtDate(start)}&end_date=${fmtDate(end)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data: any = await r.json();
    const daily = data?.daily;
    if (!daily?.time?.length) return [];
    const results: PastPrecip[] = [];
    for (let i = 0; i < daily.time.length; i++) {
      const total = (daily.precipitation_sum?.[i] || 0) + (daily.rain_sum?.[i] || 0) + (daily.showers_sum?.[i] || 0);
      const dateObj = new Date(daily.time[i] + "T00:00:00");
      const daysAgo = Math.round((targetDate.getTime() - dateObj.getTime()) / 86400000);
      if (daysAgo < 1 || daysAgo > daysBack) continue;
      results.push({ date: daily.time[i], days_ago: daysAgo, total_mm: Math.round(total * 10) / 10 });
    }
    return results;
  } catch (e) {
    console.error("[guide] past precip error:", e);
    return [];
  }
}

export interface WaterClarity {
  status: string;
  percent: number;
  explanation: string;
}

export function calculateWaterClarity(pastPrecip: PastPrecip[]): WaterClarity {
  if (!pastPrecip.length) {
    return { status: "წმინდა", percent: 95, explanation: "ნალექების მონაცემები არაა ხელმისაწვდომი, ნაგულისხმევად წმინდა" };
  }
  const heavy = pastPrecip.filter((p) => p.total_mm >= 15);
  const moderate = pastPrecip.filter((p) => p.total_mm >= 5 && p.total_mm < 15);
  const light = pastPrecip.filter((p) => p.total_mm > 0 && p.total_mm < 5);
  const mostRecent = (arr: PastPrecip[]) => arr.reduce((a, b) => (b.days_ago < a.days_ago ? b : a));

  if (heavy.length) {
    const m = mostRecent(heavy);
    if (m.days_ago === 1) {
      return { status: "მღვრიე", percent: 25, explanation: `წინა დღეს (${m.date}) ძლიერი წვიმა იყო (${m.total_mm}მმ) — წყალი მღვრიეა` };
    }
    if (m.days_ago <= 3) {
      return { status: "საშუალოდ შეფერილი", percent: 55, explanation: `${m.days_ago} დღის წინ (${m.date}) ძლიერი წვიმა იყო (${m.total_mm}მმ) — წყალი საშუალოდ შეფერილია` };
    }
    return { status: "წმინდა", percent: 85, explanation: `${m.days_ago} დღის წინ (${m.date}) იყო წვიმა, მაგრამ წყალი უკვე დასუფთავდა` };
  }
  if (moderate.length) {
    const m = mostRecent(moderate);
    if (m.days_ago <= 2) {
      return { status: "საშუალოდ შეფერილი", percent: 60, explanation: `${m.days_ago} დღის წინ (${m.date}) საშუალო წვიმა იყო (${m.total_mm}მმ)` };
    }
    return { status: "წმინდა", percent: 90, explanation: `${m.days_ago} დღის წინ (${m.date}) იყო საშუალო წვიმა, წყალი უკვე წმინდაა` };
  }
  if (light.length) {
    const m = mostRecent(light);
    return { status: "წმინდა", percent: 95, explanation: `${m.days_ago} დღის წინ (${m.date}) სუსტი ნალექი იყო (${m.total_mm}მმ) — წყალი წმინდაა` };
  }
  return { status: "წმინდა", percent: 100, explanation: "ბოლო 5 დღის განმავლობაში წვიმა არ ყოფილა — წყალი 100% გამჭვირვალეა" };
}

export function weatherDesc(code: number): string {
  const codes: Record<number, string> = {
    0: "მზიანი", 1: "ნაწილობრივ ღრუბლიანი", 2: "ღრუბლიანი", 3: "მოღრუბლული",
    45: "ნისლი", 48: "ნისლი ყინულით",
    51: "სუსტი ნამძენი", 53: "შუალედური ნამძენი", 55: "ძლიერი ნამძენი",
    61: "სუსტი წვიმა", 63: "შუალედური წვიმა", 65: "ძლიერი წვიმა",
    71: "სუსტი თოვლი", 73: "შუალედური თოვლი", 75: "ძლიერი თოვლი",
    95: "ჭექა-ქუხილი", 96: "ჭექა-ქუხილი სეტყვით", 99: "ძლიერი ჭექა-ქუხილი სეტყვით",
  };
  return codes[code] ?? "უცნობი ამინდი";
}

export interface ActivityResult {
  percent: number;
  explanations: string[];
  recommendation: string;
  best_time: string;
  bait: string;
  fish: FishInfo;
  weather: WeatherInfo;
  moon_phase: number;
  moon_name: string;
  water_clarity: WaterClarity;
}

export function calculateActivity(
  fishKey: string,
  weather: WeatherInfo,
  moonPhase: number,
  date: Date,
  waterClarity: WaterClarity
): ActivityResult {
  const fish = FISH_DATA[fishKey];
  const { temp, pressure, weather_code: wcode } = weather;
  const explanations: string[] = [];

  // წნევა (25%)
  const pDiff = Math.abs(pressure - fish.pressure_optimal);
  let pScore: number;
  if (pDiff <= fish.pressure_range) {
    pScore = 25 * (1 - pDiff / (fish.pressure_range * 2));
    explanations.push(
      pDiff < 2
        ? `✅ **წნევა (${pressure} hPa)** — თითქმის იდეალურია ${fish.name}სთვის.`
        : `✅ **წნევა (${pressure} hPa)** — კარგია, ოპტიმალურთან ახლოსაა.`
    );
  } else {
    pScore = Math.max(0, 20 - (pDiff - fish.pressure_range) * 1.5);
    explanations.push(
      pressure > fish.pressure_optimal + fish.pressure_range
        ? `⚠️ **წნევა (${pressure} hPa)** — მაღალია, ${fish.name}ი ნაკლებად აქტიურია.`
        : `⚠️ **წნევა (${pressure} hPa)** — დაბალია, თევზი ღრმად მიდის.`
    );
  }

  // ტემპერატურა (25%)
  const tDiff = Math.abs(temp - fish.temp_optimal);
  let tScore: number;
  if (tDiff <= fish.temp_range) {
    tScore = 25 * (1 - tDiff / (fish.temp_range * 2));
    explanations.push(
      tDiff < 2
        ? `✅ **ტემპერატურა (${temp}°C)** — იდეალურია ${fish.name}სთვის.`
        : `✅ **ტემპერატურა (${temp}°C)** — კარგია, კომფორტული პირობებია.`
    );
  } else {
    tScore = Math.max(0, 20 - (tDiff - fish.temp_range) * 2);
    explanations.push(
      temp > fish.temp_optimal + fish.temp_range
        ? `⚠️ **ტემპერატურა (${temp}°C)** — ძალიან თბილია, აქტივობა მცირდება.`
        : `⚠️ **ტემპერატურა (${temp}°C)** — ცივია, თევზი ნაკლებად მოძრაობს.`
    );
  }

  // მთვარის ფაზა (15%)
  let bestMoonDist = 1.0;
  for (const pref of fish.moon_preferred) {
    const dist = Math.min(Math.abs(moonPhase - pref), 1 - Math.abs(moonPhase - pref));
    if (dist < bestMoonDist) bestMoonDist = dist;
  }
  const mScore = Math.max(0, 15 * (1 - bestMoonDist * 3));
  if (bestMoonDist < 0.08) {
    explanations.push(`✅ **მთვარის ფაზა (${moonPhaseName(moonPhase)})** — საუკეთესო ფაზაა ${fish.name}სთვის!`);
  } else if (bestMoonDist < 0.2) {
    explanations.push(`✅ **მთვარის ფაზა (${moonPhaseName(moonPhase)})** — კარგი ფაზაა.`);
  } else {
    explanations.push(`⚠️ **მთვარის ფაზა (${moonPhaseName(moonPhase)})** — არაა ოპტიმალური, მაგრამ კენკვა მაინც შესაძლებელია.`);
  }

  // ამინდი (10%)
  const badWeather = [61, 63, 65, 95, 96, 99, 71, 73, 75];
  const goodWeather = [0, 1, 2, 3, 45];
  let wScore: number;
  if (badWeather.includes(wcode)) {
    wScore = 3;
    explanations.push(`⚠️ **ამინდი (${weatherDesc(wcode)})** — რთული პირობებია, თევზი ღრმად მიდის.`);
  } else if (goodWeather.includes(wcode)) {
    wScore = 10;
    explanations.push(`✅ **ამინდი (${weatherDesc(wcode)})** — კარგი პირობებია თევზაობისთვის.`);
  } else {
    wScore = 6;
    explanations.push(`⚡ **ამინდი (${weatherDesc(wcode)})** — საშუალო პირობებია.`);
  }

  // სეზონი (10%)
  const month = date.getMonth() + 1;
  let sScore: number;
  if (fish.active_months.includes(month)) {
    sScore = 10;
    explanations.push(`✅ **სეზონი** — აქტიური სეზონია ${fish.name}სთვის.`);
  } else {
    sScore = 2;
    explanations.push(`⚠️ **სეზონი** — არაა აქტიური სეზონი, მაგრამ იმედია შეგხვდებათ.`);
  }

  // წყლის გამჭვირვალობა (15%)
  const clarity = waterClarity.status;
  const clarityPct = waterClarity.percent;
  const pref = fish.clarity_pref;
  let cScore: number;
  if (clarity === pref) {
    cScore = 15;
    explanations.push(`✅ **წყლის გამჭვირვალობა (${clarity}, ${clarityPct}%)** — იდეალურია ${fish.name}სთვის! უყვარს ${pref} წყალი.`);
  } else if (pref === "საშუალო" && (clarity === "წმინდა" || clarity === "მღვრიე")) {
    cScore = 8;
    explanations.push(`⚠️ **წყლის გამჭვირვალობა (${clarity}, ${clarityPct}%)** — ${fish.name}ს ეწონება საშუალო, მაგრამ კენკვა მაინც შესაძლებელია.`);
  } else if (pref === "წმინდა" && clarity === "მღვრიე") {
    cScore = 3;
    explanations.push(`⚠️ **წყლის გამჭვირვალობა (${clarity}, ${clarityPct}%)** — ${fish.name}ს უყვარს წმინდა წყალი, მღვრიეობა ამცირებს აქტივობას.`);
  } else if (pref === "მღვრიე" && clarity === "წმინდა") {
    cScore = 5;
    explanations.push(`⚠️ **წყლის გამჭვირვალობა (${clarity}, ${clarityPct}%)** — ${fish.name}ს უყვარს მღვრიე წყალი, წმინდაში ნაკლებად აქტიურია.`);
  } else {
    cScore = 10;
    explanations.push(`✅ **წყლის გამჭვირვალობა (${clarity}, ${clarityPct}%)** — მისაღებია ${fish.name}სთვის.`);
  }

  let total = Math.round(pScore + tScore + mScore + wScore + sScore + cScore);
  total = Math.min(100, Math.max(0, total));

  let rec: string;
  if (total >= 80) rec = "🔥 საუკეთესო დღეა! აუცილებლად აიღეთ სათევზაო აღჭურვილობა და გაემგზავრეთ.";
  else if (total >= 60) rec = "👍 კარგი დღეა თევზაობისთვის. მოემზადეთ და გაემგზავრეთ არჩეულ ადგილზე.";
  else if (total >= 40) rec = "😐 საშუალო შედეგია. შესაძლოა იღბალმა გაგიღიმოთ, მაგრამ მოითმინეთ.";
  else rec = "💤 რთული დღეა. თევზი ნაკლებად აქტიურია, უმჯობესია სხვა დღეს აირჩიოთ.";

  return {
    percent: total,
    explanations,
    recommendation: rec,
    best_time: fish.best_time,
    bait: fish.bait,
    fish,
    weather,
    moon_phase: moonPhase,
    moon_name: moonPhaseName(moonPhase),
    water_clarity: waterClarity,
  };
}

export interface ForecastResult extends ActivityResult {
  date: string;
  water: WaterInfo;
  past_precipitation: PastPrecip[];
}

// short-lived cache: same fish/water/day combo → one Open-Meteo fetch per 10 min
const forecastCache = new Map<string, { ts: number; result: ForecastResult }>();
const FORECAST_CACHE_TTL = 10 * 60 * 1000;

export async function getForecast(fishKey: string, waterName: string, daysAhead: number): Promise<ForecastResult | null> {
  if (!FISH_DATA[fishKey]) return null;
  const water = ALL_WATERS.find((w) => w.name === waterName);
  if (!water) return null;

  const cacheKey = `${fishKey}|${water.name}|${Math.min(7, Math.max(0, Math.floor(daysAhead) || 0))}|${new Date().toISOString().slice(0, 10)}`;
  const cached = forecastCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < FORECAST_CACHE_TTL) return cached.result;

  const days = Math.min(7, Math.max(0, Math.floor(daysAhead) || 0));
  const targetDate = new Date(Date.now() + days * 86400000);

  const [weatherRaw, pastPrecip] = await Promise.all([
    getWeather(water.lat, water.lon, targetDate),
    getPastPrecipitation(water.lat, water.lon, targetDate),
  ]);
  const weather: WeatherInfo =
    weatherRaw ?? { temp: 18, pressure: 1013, weather_code: 1, temp_max: 22, temp_min: 14, precipitation: 0, rain: 0, showers: 0 };

  const waterClarity = calculateWaterClarity(pastPrecip);
  const moonPhase = getMoonPhase(targetDate);
  const result = calculateActivity(fishKey, weather, moonPhase, targetDate, waterClarity);

  const forecast: ForecastResult = {
    ...result,
    date: targetDate.toISOString().slice(0, 10),
    water,
    past_precipitation: pastPrecip,
  };
  if (forecastCache.size > 500) forecastCache.clear();
  forecastCache.set(cacheKey, { ts: Date.now(), result: forecast });
  return forecast;
}
