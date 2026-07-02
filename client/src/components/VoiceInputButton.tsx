import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  lang?: string;
  className?: string;
  "data-testid"?: string;
};

function getRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function VoiceInputButton({
  onTranscript,
  disabled,
  lang = "ka-GE",
  className = "",
  ...rest
}: Props) {
  const { toast } = useToast();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    let rec: any;
    try {
      rec = new Ctor();
    } catch {
      return;
    }
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
    rec.onerror = (e: any) => {
      setListening(false);
      if (e && (e.error === "not-allowed" || e.error === "service-not-allowed")) {
        toast({
          title: "მიკროფონზე წვდომა არ არის",
          description: "გთხოვთ დაუშვათ მიკროფონის გამოყენება ბრაუზერის პარამეტრებში.",
          variant: "destructive",
        });
      }
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.stop();
      } catch {}
    };
  }, [lang, toast]);

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
    if (!rec) {
      toast({
        title: "ხმოვანი შეყვანა მიუწვდომელია",
        description:
          "თქვენი ბრაუზერი ხმოვან შეყვანას არ უჭერს მხარს. სცადეთ Chrome-ით გახსნა.",
      });
      return;
    }
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
