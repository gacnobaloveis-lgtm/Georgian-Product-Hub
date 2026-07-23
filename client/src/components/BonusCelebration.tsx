import { useEffect, useRef } from "react";

// --- Web Audio celebration sound (no audio file needed) ---
function playCelebrationSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const audioCtx = new Ctx();

    // Boom
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);

    // Sparkle arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((freq, i) => {
      const sOsc = audioCtx.createOscillator();
      const sGain = audioCtx.createGain();
      sOsc.type = "sine";
      sOsc.frequency.value = freq;
      const t = audioCtx.currentTime + 0.1 + i * 0.08;
      sGain.gain.setValueAtTime(0, t);
      sGain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      sOsc.connect(sGain);
      sGain.connect(audioCtx.destination);
      sOsc.start(t);
      sOsc.stop(t + 0.3);
    });
  } catch {
    // audio blocked — ignore
  }
}

// --- Lightweight star confetti on a canvas (no library) ---
type Particle = {
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number; size: number; color: string;
  life: number; maxLife: number; shape: "star" | "circle";
};

const COLORS = ["#FFE15D", "#FFB100", "#FFF5E4", "#FFD700", "#FFA500"];

function spawnBurst(particles: Particle[], cx: number, cy: number) {
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: 5 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 0,
      maxLife: 80 + Math.random() * 40,
      shape: Math.random() < 0.6 ? "star" : "circle",
    });
  }
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size / 2;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

interface BonusCelebrationProps {
  points: number;
  open: boolean;
  onClose: () => void;
}

export function BonusCelebration({ points, open, onClose }: BonusCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    playCelebrationSound();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    spawnBurst(particles, canvas.width / 2, canvas.height / 2.5);
    const secondWave = setTimeout(() => spawnBurst(particles, canvas.width / 2, canvas.height / 2.5), 300);

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.rot += p.vr;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "star") {
          drawStar(ctx, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (particles.length > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearTimeout(secondWave);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      data-testid="dialog-bonus-celebration"
    >
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[101]" />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/30 bg-slate-800/90 p-8 text-center shadow-2xl">
        <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl" />
        <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-yellow-500/20 blur-2xl" />

        <div className="mb-4 inline-block animate-bounce text-6xl">⭐</div>

        <h2 className="mb-2 text-2xl font-black uppercase tracking-wide text-amber-400">
          გილოცავთ! 🎉
        </h2>

        <p className="mb-4 text-base text-slate-300">
          შენაძენის გაკეთებისთვის თქვენ ავტომატურად დაგერიცხათ:
        </p>

        <div className="my-2 rounded-2xl border border-amber-500/40 bg-slate-900/80 py-4 shadow-inner">
          <span className="text-4xl font-extrabold tracking-wider text-amber-400" data-testid="text-bonus-amount">
            +{points}
          </span>
          <span className="mt-1 block text-lg font-bold text-amber-500">ბონუს ქულა</span>
        </div>

        <p className="mb-6 mt-3 text-xs text-slate-400">
          ✨ ბონუსებით შეგიძლიათ შეიძინოთ სასურველი ნივთები საიტზე.
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-yellow-400 active:scale-95"
          data-testid="button-bonus-close"
        >
          მშვენიერია, მადლობა!
        </button>
      </div>
    </div>
  );
}
