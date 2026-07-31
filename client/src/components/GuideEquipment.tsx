import { ReactNode } from "react";
import {
  Ruler,
  RotateCw,
  Cable,
  Fish,
  CheckCircle2,
  Star,
} from "lucide-react";

// თითო თევზის აღჭურვილობის კომპლექტი — ადმინი ავსებს ადმინ პანელიდან
export interface FishEquipment {
  rod?: {
    lengths?: string[]; // ["2.10 მ", "2.00 მ"]
    action?: string; // Fast
    power?: string; // Light
    casting?: string; // 2–7 გ
  };
  reel?: {
    sizes?: string[]; // ["2000", "2500"]
    gearRatio?: string; // 5.2:1
    brake?: string; // 5-8 კგ
  };
  line?: { min?: string; best?: string; max?: string }; // PE
  lure?: { types?: string[]; weight?: string };
  fluoro?: { min?: string; best?: string; max?: string };
  recs?: string[];
}

export type GuideEquipmentMap = Record<string, FishEquipment>;

const cardCls =
  "rounded-2xl border border-white/15 bg-slate-900/70 p-4 shadow-xl backdrop-blur-md";

function EqCard({
  title,
  color,
  icon,
  children,
  testId,
}: {
  title: string;
  color: string;
  icon: ReactNode;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div className={cardCls} data-testid={testId}>
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${color}20` }}
        >
          {icon}
        </div>
        <h3 className="text-base font-bold" style={{ color }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <b className="text-white">{value}</b>
    </div>
  );
}

function Badges({ items, cls }: { items?: string[]; cls: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function hasAny(eq?: FishEquipment): boolean {
  if (!eq) return false;
  return Boolean(
    (eq.rod && (eq.rod.lengths?.length || eq.rod.action || eq.rod.power || eq.rod.casting)) ||
      (eq.reel && (eq.reel.sizes?.length || eq.reel.gearRatio || eq.reel.brake)) ||
      (eq.line && (eq.line.min || eq.line.best || eq.line.max)) ||
      (eq.lure && (eq.lure.types?.length || eq.lure.weight)) ||
      (eq.fluoro && (eq.fluoro.min || eq.fluoro.best || eq.fluoro.max)) ||
      eq.recs?.length,
  );
}

export function guideEquipmentHasData(eq?: FishEquipment) {
  return hasAny(eq);
}

export default function GuideEquipment({ eq }: { eq: FishEquipment }) {
  if (!hasAny(eq)) return null;
  const showRod = eq.rod && (eq.rod.lengths?.length || eq.rod.action || eq.rod.power || eq.rod.casting);
  const showReel = eq.reel && (eq.reel.sizes?.length || eq.reel.gearRatio || eq.reel.brake);
  const showLine = eq.line && (eq.line.min || eq.line.best || eq.line.max);
  const showLure = eq.lure && (eq.lure.types?.length || eq.lure.weight);
  const showFluoro = eq.fluoro && (eq.fluoro.min || eq.fluoro.best || eq.fluoro.max);
  const showRecs = eq.recs && eq.recs.length > 0;

  return (
    <div data-testid="section-guide-equipment">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_60%)]">
        <Star className="h-5 w-5 text-emerald-300" />
        სპინინგის კომპლექტი
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {showRod && (
          <EqCard title="ჯოხი" color="#22c55e" icon={<Fish className="h-5 w-5 text-green-400" />} testId="card-eq-rod">
            <div className="space-y-2">
              <Row label="Action" value={eq.rod?.action} />
              <Row label="Power" value={eq.rod?.power} />
              <Row label="ტყორცნის წონა" value={eq.rod?.casting} />
            </div>
            <Badges items={eq.rod?.lengths} cls="border-green-500/40 bg-green-500/10 text-green-300" />
          </EqCard>
        )}
        {showReel && (
          <EqCard title="კოჭა" color="#0ea5e9" icon={<RotateCw className="h-5 w-5 text-sky-400" />} testId="card-eq-reel">
            <div className="space-y-2">
              <Row label="Gear Ratio" value={eq.reel?.gearRatio} />
              <Row label="მუხრუჭი" value={eq.reel?.brake} />
            </div>
            <Badges items={eq.reel?.sizes} cls="border-sky-500/40 bg-sky-500/10 text-sky-300" />
          </EqCard>
        )}
        {showLine && (
          <EqCard title="წნული" color="#8b5cf6" icon={<Cable className="h-5 w-5 text-violet-400" />} testId="card-eq-line">
            <div className="space-y-2">
              <Row label="მინ." value={eq.line?.min} />
              <Row label="საუკეთესო" value={eq.line?.best} />
              <Row label="მაქს." value={eq.line?.max} />
            </div>
          </EqCard>
        )}
        {showLure && (
          <EqCard title="სატყუარა" color="#f97316" icon={<Fish className="h-5 w-5 text-orange-400" />} testId="card-eq-lure">
            <ul className="space-y-1.5 text-sm text-white">
              {(eq.lure?.types || []).map((t) => (
                <li key={t}>🎣 {t}</li>
              ))}
            </ul>
            {eq.lure?.weight && (
              <div className="mt-3 inline-block rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-300">
                წონა: {eq.lure.weight}
              </div>
            )}
          </EqCard>
        )}
        {showFluoro && (
          <EqCard title="ფლუორო" color="#facc15" icon={<Ruler className="h-5 w-5 text-yellow-400" />} testId="card-eq-fluoro">
            <div className="space-y-2">
              <Row label="მინ." value={eq.fluoro?.min} />
              <Row label="საუკეთესო" value={eq.fluoro?.best} />
              <Row label="მაქს." value={eq.fluoro?.max} />
            </div>
          </EqCard>
        )}
        {showRecs && (
          <EqCard title="რეკომენდაცია" color="#06b6d4" icon={<CheckCircle2 className="h-5 w-5 text-cyan-400" />} testId="card-eq-recs">
            <ul className="space-y-1.5 text-sm text-white">
              {(eq.recs || []).map((r) => (
                <li key={r} className="flex items-start gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </EqCard>
        )}
      </div>
    </div>
  );
}
