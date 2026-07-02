import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  lang?: string;
  className?: string;
  "data-testid"?: string;
};

function getRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function VoiceInputButton({
  onTranscript,
  disabled,
  lang = "ka-GE",
  className = "",
  ...rest
}: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    const rec = getRecognition();
    if (!rec) {
      setSupported(false);
      return;
    }
    setSupported(true);
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      text = text.trim();
      if (text) onTranscriptRef.current(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.stop();
      } catch {}
    };
  }, [lang]);

  useEffect(() => {
    if (disabled && listening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setListening(false);
    }
  }, [disabled, listening]);

  function toggle() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      try {
        rec.stop();
      } catch {}
      setListening(false);
      return;
    }
    try {
      rec.lang = lang;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "ჩაწერის შეჩერება" : "ხმოვანი შეყვანა"}
      aria-label={listening ? "ჩაწერის შეჩერება" : "ხმოვანი შეყვანა"}
      aria-pressed={listening}
      className={
        "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 " +
        (listening
          ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
          : "border border-white/15 bg-slate-900/60 text-white/80 hover:bg-slate-800/60") +
        (className ? " " + className : "")
      }
      data-testid={rest["data-testid"] || "button-voice-input"}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
