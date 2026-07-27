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
  image: string;
}

export const FISH_DATA: Record<string, FishInfo> = {
  kashapi: {
    name: "ქაშაპი",
    latin: "Silurus glanis",
    desc: "საქართველოს უდიდესი მტაცებელი თევზი. აქტიურია სატყუარებზე წმინდა და სუფთა წყალში, უყვარს თბილი წყალი და ნორმალური წნევა.",
    pressure_optimal: 1015,
    pressure_range: 8,
    temp_optimal: 21,
    temp_range: 5,
    moon_preferred: [0.0, 0.5],
    active_months: [4, 5, 6, 7, 8, 9, 10],
    best_time: "ღამე 00:00 – განთიადი",
    bait: "კიბორჩხალა, თევზი, ჭია",
    color: "#00d9a5",
    clarity_pref: "წმინდა",
    image: "/guide-fish/kashapi.jpg",
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
    image: "/guide-fish/kalmahi.jpg",
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
    image: "/guide-fish/korchila.jpg",
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
    image: "/guide-fish/kariklapi.jpg",
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
    image: "/guide-fish/shamaya.jpg",
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
    { name: "მდ. მტკვარი", region: "თბილისი / ქართლი", lat: 41.7151, lon: 44.8271 },
    { name: "მდ. ალაზანი", region: "კახეთი (თელავი)", lat: 41.92, lon: 45.48 },
    { name: "მდ. იორი", region: "კახეთი (საგარეჯო)", lat: 41.73, lon: 45.33 },
    { name: "მდ. არაგვი (თეთრი, შავი, ფშავის, ხევსურეთის)", region: "მცხეთა-მთიანეთი", lat: 42.13, lon: 44.77 },
    { name: "მდ. დიდი ლიახვი", region: "შიდა ქართლი (გორი)", lat: 42.1, lon: 43.97 },
    { name: "მდ. პატარა ლიახვი", region: "შიდა ქართლი", lat: 42.12, lon: 44.05 },
    { name: "მდ. ქსანი", region: "შიდა ქართლი (მუხრანი)", lat: 42.0, lon: 44.42 },
    { name: "მდ. ხრამი", region: "ქვემო ქართლი (წალკა)", lat: 41.45, lon: 44.35 },
    { name: "მდ. დებედა", region: "ქვემო ქართლი (მარნეული)", lat: 41.44, lon: 44.85 },
    { name: "მდ. ალგეთი", region: "ქვემო ქართლი (თეთრიწყარო)", lat: 41.62, lon: 44.55 },
    { name: "მდ. ფარავანი", region: "ჯავახეთი", lat: 41.4, lon: 43.7 },
    { name: "მდ. ძამა", region: "შიდა ქართლი (ქარელი)", lat: 42.0, lon: 43.85 },
    { name: "მდ. ტანა", region: "შიდა ქართლი (გორი)", lat: 41.95, lon: 44.05 },
    { name: "მდ. თეძამი", region: "შიდა ქართლი (კასპი)", lat: 41.95, lon: 44.35 },
    { name: "მდ. რიონი", region: "იმერეთი (ქუთაისი)", lat: 42.27, lon: 42.71 },
    { name: "მდ. ცხენისწყალი", region: "ლეჩხუმი (ცაგერი)", lat: 42.65, lon: 42.77 },
    { name: "მდ. ყვირილა", region: "იმერეთი (ზესტაფონი)", lat: 42.11, lon: 43.05 },
    { name: "მდ. ხანისწყალი", region: "იმერეთი (ბაღდათი)", lat: 42.05, lon: 42.83 },
    { name: "მდ. ჯეჯორა", region: "რაჭა (ონი)", lat: 42.58, lon: 43.45 },
    { name: "მდ. ჩხერიმელა", region: "იმერეთი (ხარაგაული)", lat: 42.02, lon: 43.2 },
    { name: "მდ. ენგური", region: "სამეგრელო (ზუგდიდი)", lat: 42.51, lon: 41.87 },
    { name: "მდ. ჭოროხი", region: "აჭარა (ბათუმი)", lat: 41.6, lon: 41.65 },
    { name: "მდ. აჭარისწყალი", region: "აჭარა (ქედა)", lat: 41.6, lon: 41.94 },
    { name: "მდ. კოდორი", region: "აფხაზეთი", lat: 42.85, lon: 41.15 },
    { name: "მდ. ბზიფი", region: "აფხაზეთი", lat: 43.2, lon: 40.6 },
    { name: "მდ. ხობისწყალი", region: "სამეგრელო (ხობი)", lat: 42.32, lon: 41.9 },
    { name: "მდ. ტეხური", region: "სამეგრელო (სენაკი)", lat: 42.4, lon: 42.07 },
    { name: "მდ. აბაშა", region: "სამეგრელო (მარტვილი)", lat: 42.4, lon: 42.38 },
    { name: "მდ. სუფსა", region: "გურია (ოზურგეთი)", lat: 41.95, lon: 42.0 },
    { name: "მდ. ნატანები", region: "გურია (ურეკი)", lat: 41.95, lon: 41.8 },
    { name: "მდ. კინტრიში", region: "აჭარა (ქობულეთი)", lat: 41.8, lon: 41.95 },
    { name: "მდ. ჩაქვისწყალი", region: "აჭარა (ჩაქვი)", lat: 41.72, lon: 41.73 },
    { name: "მდ. ფსოუ", region: "აფხაზეთი (გაგრა)", lat: 43.28, lon: 40.27 },
    { name: "მდ. თერგი", region: "მცხეთა-მთიანეთი (ყაზბეგი)", lat: 42.66, lon: 44.64 },
    { name: "მდ. არღუნი", region: "ხევსურეთი (შატილი)", lat: 42.66, lon: 45.15 },
  ],
  lakes: [
    { name: "ფარავნის ტბა", region: "ჯავახეთი (ნინოწმინდა)", lat: 41.45, lon: 43.8 },
    { name: "ტაბაწყური", region: "სამცხე-ჯავახეთი", lat: 41.65, lon: 43.63 },
    { name: "რიწის ტბა", region: "აფხაზეთი", lat: 43.48, lon: 40.54 },
    { name: "ლისის ტბა", region: "თბილისი", lat: 41.74, lon: 44.73 },
    { name: "კუს ტბა", region: "თბილისი", lat: 41.7, lon: 44.75 },
    { name: "ბაზალეთის ტბა", region: "მცხეთა-მთიანეთი (დუშეთი)", lat: 42.03, lon: 44.68 },
    { name: "პალიასტომი", region: "სამეგრელო (ფოთი)", lat: 42.12, lon: 41.73 },
    { name: "ჯანდარის ტბა", region: "ქვემო ქართლი (გარდაბანი)", lat: 41.4, lon: 45.1 },
    { name: "ხანჩალის ტბა", region: "ჯავახეთი (ნინოწმინდა)", lat: 41.26, lon: 43.58 },
    { name: "ბუღდაშენის ტბა", region: "ჯავახეთი (ნინოწმინდა)", lat: 41.2, lon: 43.65 },
    { name: "მადათაფა", region: "ჯავახეთი", lat: 41.18, lon: 43.78 },
    { name: "საღამოს ტბა", region: "ჯავახეთი", lat: 41.3, lon: 43.78 },
    { name: "მწვანე ტბა", region: "აჭარა (ხულო)", lat: 41.65, lon: 42.32 },
    { name: "შავი კლდეების ტბა", region: "კახეთი (ლაგოდეხი)", lat: 41.92, lon: 46.32 },
    { name: "აბუდელაურის ტბები (თეთრი, ლურჯი, მწვანე)", region: "ხევსურეთი", lat: 42.52, lon: 44.87 },
    { name: "ორეთის ტბა", region: "რაჭა-ლეჩხუმი", lat: 42.55, lon: 43.0 },
    { name: "ტობავარჩხილი", region: "სამეგრელოს მთიანეთი", lat: 42.83, lon: 42.35 },
    { name: "კელის ტბა", region: "მთიანეთი (ყელის ზეგანი)", lat: 42.54, lon: 44.28 },
    { name: "პატარა რიწა", region: "აფხაზეთი", lat: 43.47, lon: 40.5 },
    { name: "ამტყელის ტბა", region: "აფხაზეთი", lat: 43.07, lon: 41.28 },
    { name: "ეწერის ტბა", region: "სამეგრელო", lat: 42.6, lon: 42.05 },
    { name: "ყარაღაჯის ტბა", region: "კახეთი (დედოფლისწყარო)", lat: 41.35, lon: 46.05 },
    { name: "თბილისის ზღვა (წყალსაცავი)", region: "თბილისი", lat: 41.77, lon: 44.87 },
    { name: "ჟინვალის წყალსაცავი", region: "მცხეთა-მთიანეთი", lat: 42.13, lon: 44.77 },
    { name: "ენგურის წყალსაცავი", region: "სამეგრელო (ჯვარი)", lat: 42.75, lon: 42.05 },
    { name: "ფალდოს (სიონის) წყალსაცავი", region: "მცხეთა-მთიანეთი (თიანეთი)", lat: 41.99, lon: 45.02 },
    { name: "შაორის წყალსაცავი", region: "რაჭა (ამბროლაური)", lat: 42.42, lon: 43.05 },
    { name: "ტყიბულის წყალსაცავი", region: "იმერეთი (ტყიბული)", lat: 42.37, lon: 42.98 },
    { name: "ვალეს წყალსაცავი", region: "სამცხე (ახალციხე)", lat: 41.6, lon: 42.85 },
    { name: "ალგეთის წყალსაცავი", region: "ქვემო ქართლი", lat: 41.5, lon: 44.6 },
    { name: "წალკის წყალსაცავი", region: "ქვემო ქართლი (წალკა)", lat: 41.6, lon: 44.05 },
    { name: "ნადარბაზევის ტბა (წყალსაცავი)", region: "შიდა ქართლი (გორი)", lat: 41.9, lon: 44.2 },
    { name: "სამგორის წყალსაცავი", region: "თბილისის ზღვასთან", lat: 41.75, lon: 45.0 },
    { name: "ვარციხის წყალსაცავი", region: "იმერეთი (ბაღდათი)", lat: 42.15, lon: 42.72 },
    { name: "გალის წყალსაცავი", region: "აფხაზეთი (გალი)", lat: 42.65, lon: 41.75 },
  ],
};

export const ALL_WATERS: WaterInfo[] = [...WATERS.rivers, ...WATERS.lakes];

// ძველი (გაზიარებულ ბმულებში დარჩენილი) სახელების ალიასები → ახალი კანონიკური სახელი
export const WATER_NAME_ALIASES: Record<string, string> = {
  "თბილისის ზღვა": "თბილისის ზღვა (წყალსაცავი)",
  "მადათაფის ტბა": "მადათაფა",
  "თობავარჩხილის ტბა": "ტობავარჩხილი",
  "მდ. პარავანი": "მდ. ფარავანი",
  "მდ. საფსაი": "მდ. სუფსა",
};

// მდინარეები, რომლებიც სეზონურად (გაზაფხულიდან ნოემბრამდე) თითქმის მუდმივად მღვრიეა
// მყინვარული/სეზონური ნატანის გამო — ამინდის მიუხედავად
const SEASONAL_MUDDY_RIVERS = ["მდ. რიონი", "მდ. ცხენისწყალი"];
const MUDDY_MONTHS = [4, 5, 6, 7, 8, 9, 10]; // აპრილი–ოქტომბერი (ნოემბრამდე)

export function seasonalMuddyOverride(waterName: string, date: Date): WaterClarity | null {
  if (!SEASONAL_MUDDY_RIVERS.includes(waterName)) return null;
  const month = date.getMonth() + 1;
  if (!MUDDY_MONTHS.includes(month)) return null;
  return {
    status: "მღვრიე",
    percent: 25,
    explanation: `${waterName} ამ სეზონზე (ნოემბრამდე) თითქმის მუდმივად მღვრიეა სეზონური ნატანის გამო`,
  };
}

export function resolveWater(waterName: string): WaterInfo | undefined {
  const canonical = WATER_NAME_ALIASES[waterName] || waterName;
  return ALL_WATERS.find((w) => w.name === canonical);
}

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

export interface HourlySlot {
  hour: string; // "06:00"
  wind: number; // კმ/სთ
  precip: number; // მმ (3-საათიანი ჯამი)
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
  wind_max: number;
  hourly: HourlySlot[];
}

export async function getWeather(lat: number, lon: number, targetDate: Date): Promise<WeatherInfo | null> {
  try {
    const d = fmtDate(targetDate);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,pressure_msl_mean,weathercode,precipitation_sum,rain_sum,showers_sum,wind_speed_10m_max` +
      `&hourly=wind_speed_10m,precipitation` +
      `&timezone=Asia/Tbilisi&start_date=${d}&end_date=${d}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data: any = await r.json();
    const daily = data?.daily;
    if (!daily?.time?.length) return null;
    const temp = (daily.temperature_2m_max[0] + daily.temperature_2m_min[0]) / 2;

    // საათობრივი მონაცემები → 3-საათიანი ჭრილები (00:00, 03:00 ... 21:00)
    const hourly: HourlySlot[] = [];
    const hTimes: string[] = data?.hourly?.time || [];
    const hWind: number[] = data?.hourly?.wind_speed_10m || [];
    const hPrecip: number[] = data?.hourly?.precipitation || [];
    for (let slot = 0; slot < 24; slot += 3) {
      let windMax = 0;
      let precipSum = 0;
      let found = false;
      for (let h = slot; h < slot + 3; h++) {
        const idx = hTimes.findIndex((t) => t === `${d}T${String(h).padStart(2, "0")}:00`);
        if (idx === -1) continue;
        found = true;
        windMax = Math.max(windMax, hWind[idx] ?? 0);
        precipSum += hPrecip[idx] ?? 0;
      }
      if (found) {
        hourly.push({
          hour: `${String(slot).padStart(2, "0")}:00`,
          wind: Math.round(windMax),
          precip: Math.round(precipSum * 10) / 10,
        });
      }
    }
    return {
      temp: Math.round(temp * 10) / 10,
      pressure: Math.round(daily.pressure_msl_mean[0] * 10) / 10,
      weather_code: daily.weathercode[0],
      temp_max: daily.temperature_2m_max[0],
      temp_min: daily.temperature_2m_min[0],
      precipitation: Math.round((daily.precipitation_sum?.[0] || 0) * 10) / 10,
      rain: Math.round((daily.rain_sum?.[0] || 0) * 10) / 10,
      showers: Math.round((daily.showers_sum?.[0] || 0) * 10) / 10,
      wind_max: Math.round(daily.wind_speed_10m_max?.[0] || 0),
      hourly,
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
  const water = resolveWater(waterName);
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
    weatherRaw ?? { temp: 18, pressure: 1013, weather_code: 1, temp_max: 22, temp_min: 14, precipitation: 0, rain: 0, showers: 0, wind_max: 0, hourly: [] };

  const waterClarity = seasonalMuddyOverride(water.name, targetDate) ?? calculateWaterClarity(pastPrecip);
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
