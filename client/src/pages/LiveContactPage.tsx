import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Send, ArrowLeft, MessageCircle, Lock, LogIn, UserPlus } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";
import { showNotification, requestNotificationPermission } from "@/lib/web-notification";
import mountainSceneBg from "@assets/mountain-scene-bg.webp";

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(2,6,23,0.6),rgba(2,6,23,0.7)), url(${mountainSceneBg})`,
  backgroundSize: "cover",
  backgroundPosition: "right center",
  backgroundAttachment: typeof window !== "undefined" && window.innerWidth >= 768 ? "fixed" : "scroll",
};

function formatTime(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
}

export default function LiveContactPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [operatorTyping, setOperatorTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "მომხმარებელი" : "";

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    enabled: isAuthenticated,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    queryClient.invalidateQueries({ queryKey: ["/api/chat/unread-count"] });
  }, [isAuthenticated, messages, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat/messages", { message });
      return res.json() as Promise<ChatMessage>;
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData<ChatMessage[]>(["/api/chat/messages"], (old = []) => {
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      // Show "operator is typing…" indicator for up to 25s (matches server's 20s bot delay)
      setOperatorTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setOperatorTyping(false), 25000);
    },
  });

  // Hide typing indicator as soon as a new admin/bot reply arrives.
  useEffect(() => {
    if (!operatorTyping || messages.length === 0) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.senderType === "user");
    if (lastUserIdx === -1) return;
    const lastUserPos = messages.length - 1 - lastUserIdx;
    const hasReplyAfter = messages.slice(lastUserPos + 1).some((m) => m.senderType !== "user");
    if (hasReplyAfter) {
      setOperatorTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  }, [messages, operatorTyping]);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

  function scrollToBottom(smooth = true) {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }

  useEffect(() => {
    // Wait for the DOM to render new bubbles (and the typing indicator)
    // before scrolling, so the latest reply is always in view automatically.
    const id = setTimeout(() => scrollToBottom(true), 80);
    return () => clearTimeout(id);
  }, [messages, operatorTyping]);

  useEffect(() => {
    scrollToBottom(false);
  }, [isAuthenticated]);

  function handleSend() {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(text);
    setTimeout(() => scrollToBottom(true), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Ask for notification permission when chat opens
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const prevBotCountRef = useRef(0);
  useEffect(() => {
    const botMsgs = messages.filter((m) => m.senderType !== "user");
    if (botMsgs.length > prevBotCountRef.current && prevBotCountRef.current > 0) {
      const last = botMsgs[botMsgs.length - 1];
      showNotification("💬 spiningebi.ge", last?.message?.substring(0, 100) ?? "ახალი შეტყობინება", {
        tag: "live-chat",
      });
    }
    prevBotCountRef.current = botMsgs.length;
  }, [messages]);

  return (
    <div
      className="flex flex-col overflow-hidden text-white"
      style={{ height: "100dvh", ...PAGE_BG_STYLE }}
    >
      {/* Header */}
      <div className="shrink-0 bg-slate-950/55 backdrop-blur-md border-b border-emerald-400/20 shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
            data-testid="button-back-chat"
          >
            <ArrowLeft className="h-4 w-4" />
            უკან
          </button>
          <div className="flex-1 flex items-center gap-2.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-emerald-300" />
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">spiningebi.ge</p>
              <p className="text-xs text-emerald-300">ონლაინ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages — takes all remaining height, scrolls internally */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-4 space-y-3">
          {/* Greeting bubble */}
          <div className="flex items-end gap-2">
            <div className="h-7 w-7 shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-300">
              SP
            </div>
            <div className="max-w-[75%]">
              <p className="text-[11px] text-white/65 mb-1">spiningebi.ge</p>
              <div className="rounded-2xl rounded-bl-sm bg-slate-900/60 border border-white/15 backdrop-blur-md px-4 py-2.5 shadow-sm">
                <p className="text-sm text-white/90">
                  გამარჯობა! მოგესალმებათ spiningebi.ge ადმინისტრატორი. დასვით თქვენი შეკითხვა, სიამოვნებით დაგეხმარებით! 🎣
                </p>
              </div>
            </div>
          </div>

          {!authLoading && !isAuthenticated ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="rounded-full bg-slate-900/60 border border-white/15 shadow-sm backdrop-blur-md p-4">
                <Lock className="h-6 w-6 text-emerald-300" />
              </div>
              <p className="text-sm text-white/65">
                მიწერა შეუძლიათ მხოლოდ რეგისტრირებულ მომხმარებლებს
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => { setAuthTab("login"); setAuthOpen(true); }}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid="button-chat-login"
                >
                  <LogIn className="h-4 w-4" />
                  შესვლა
                </Button>
                <Button
                  onClick={() => { setAuthTab("register"); setAuthOpen(true); }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-purple-300 text-white/90 hover:bg-purple-50"
                  data-testid="button-chat-register"
                >
                  <UserPlus className="h-4 w-4" />
                  რეგისტრაცია
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isUser = msg.senderType === "user";
                const isAdmin = msg.senderType === "admin";

                if (isUser) {
                  return (
                    <div key={msg.id} className="flex items-end gap-2 justify-end">
                      <div className="max-w-[75%]">
                        <p className="text-[11px] text-white/65 mb-1 text-right">{userName}</p>
                        <div className="rounded-2xl rounded-br-sm bg-primary px-4 py-2.5">
                          <p className="text-sm text-emerald-300-foreground">{msg.message}</p>
                        </div>
                        <p className="text-[10px] text-white/65 mt-1 text-right">{formatTime(msg.createdAt)}</p>
                      </div>
                      <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                        {(user?.firstName?.[0] || "მ").toUpperCase()}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-end gap-2">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                      SP
                    </div>
                    <div className="max-w-[75%]">
                      <p className="text-[11px] text-white/65 mb-1">
                        {isAdmin ? "spiningebi.ge" : "spiningebi.ge 🤖"}
                      </p>
                      <div
                        className={`rounded-2xl rounded-bl-sm px-4 py-2.5 ${
                          isAdmin
                            ? "bg-emerald-500/15 border border-emerald-400/30 backdrop-blur-md"
                            : "bg-slate-900/60 border border-white/15 shadow-sm backdrop-blur-md"
                        }`}
                      >
                        <p className="text-sm text-white/90">{msg.message}</p>
                      </div>
                      <p className="text-[10px] text-white/65 mt-1">{formatTime(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}

              {sendMutation.isPending && (
                <div className="flex items-end gap-2 justify-end opacity-60">
                  <div className="max-w-[75%]">
                    <p className="text-[11px] text-white/65 mb-1 text-right">{userName}</p>
                    <div className="rounded-2xl rounded-br-sm bg-primary/70 px-4 py-2.5">
                      <p className="text-sm text-emerald-300-foreground">...</p>
                    </div>
                  </div>
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                    {(user?.firstName?.[0] || "მ").toUpperCase()}
                  </div>
                </div>
              )}

              {operatorTyping && !sendMutation.isPending && (
                <div className="flex items-end gap-2" data-testid="indicator-operator-typing">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                    SP
                  </div>
                  <div className="max-w-[75%]">
                    <p className="text-[11px] text-white/65 mb-1">spiningebi.ge წერს...</p>
                    <div className="rounded-2xl rounded-bl-sm bg-slate-900/60 border border-emerald-400/30 backdrop-blur-md px-4 py-3 shadow-sm inline-flex items-center gap-1">
                      <span className="block h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="block h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="block h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input — pinned to bottom, shrinks with keyboard on mobile */}
      {isAuthenticated && (
        <div className="shrink-0 bg-slate-950/55 backdrop-blur-md border-t border-emerald-400/20 safe-area-bottom">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setTimeout(() => scrollToBottom(true), 300)}
                placeholder="შეტყობინება..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-white/15 bg-slate-900/60 text-white placeholder:text-white/40 px-4 py-2.5 text-sm outline-none backdrop-blur-md focus:border-primary transition-colors"
                style={{ minHeight: "44px", maxHeight: "120px" }}
                data-testid="input-chat-message"
              />
              <VoiceInputButton
                disabled={sendMutation.isPending}
                onTranscript={(t) => {
                  setInput((prev) => (prev ? prev.trimEnd() + " " + t : t));
                  requestAnimationFrame(() => {
                    const el = inputRef.current;
                    if (el) {
                      el.style.height = "auto";
                      el.style.height = Math.min(el.scrollHeight, 120) + "px";
                    }
                  });
                }}
                data-testid="button-voice-chat"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
                data-testid="button-send-chat"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AuthLoginDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authTab}
      />
    </div>
  );
}
