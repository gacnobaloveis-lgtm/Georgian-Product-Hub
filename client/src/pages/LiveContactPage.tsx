import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Send, ArrowLeft, MessageCircle, Lock, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";
import { AuthLoginDialog } from "@/components/AuthLoginDialog";

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
  const [optimistic, setOptimistic] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "მომხმარებელი" : "";

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    enabled: isAuthenticated,
    refetchInterval: 4000,
  });

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", "/api/chat/messages", { message });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setOptimistic([]);
    },
    onError: () => {
      setOptimistic([]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, optimistic]);

  function handleSend() {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setOptimistic((prev) => [...prev, text]);
    setInput("");
    sendMutation.mutate(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-border shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-chat"
          >
            <ArrowLeft className="h-4 w-4" />
            უკან
          </button>
          <div className="flex-1 flex items-center gap-2.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">spiningebi.ge</p>
              <p className="text-xs text-emerald-600">ონლაინ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 mx-auto w-full max-w-2xl px-4 py-4 space-y-3 overflow-y-auto">
        {/* Greeting */}
        <div className="flex items-end gap-2">
          <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
            SP
          </div>
          <div className="max-w-[75%]">
            <p className="text-[11px] text-muted-foreground mb-1">spiningebi.ge</p>
            <div className="rounded-2xl rounded-bl-sm bg-white border border-purple-100 px-4 py-2.5 shadow-sm">
              <p className="text-sm text-purple-700">გამარჯობა! მოგესალმებათ spiningebi.ge ადმინისტრატორი. დასვით თქვენი შეკითხვა, სიამოვნებით დაგეხმარებით! 🎣</p>
            </div>
          </div>
        </div>

        {!authLoading && !isAuthenticated ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-white border border-purple-100 shadow-sm p-4">
              <Lock className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-sm text-muted-foreground">მიწერა შეუძლიათ მხოლოდ რეგისტრირებულ მომხმარებლებს</p>
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
                className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
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
                      <p className="text-[11px] text-muted-foreground mb-1 text-right">{userName}</p>
                      <div className="rounded-2xl rounded-br-sm bg-primary px-4 py-2.5">
                        <p className="text-sm text-primary-foreground">{msg.message}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">{formatTime(msg.createdAt)}</p>
                    </div>
                    <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {(user?.firstName?.[0] || "მ").toUpperCase()}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex items-end gap-2">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    SP
                  </div>
                  <div className="max-w-[75%]">
                    <p className="text-[11px] text-muted-foreground mb-1">{isAdmin ? "spiningebi.ge" : "spiningebi.ge 🤖"}</p>
                    <div className={`rounded-2xl rounded-bl-sm px-4 py-2.5 ${isAdmin ? "bg-emerald-50 border border-emerald-100" : "bg-white border border-purple-100 shadow-sm"}`}>
                      <p className="text-sm text-purple-700">{msg.message}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              );
            })}

            {optimistic.map((text, i) => (
              <div key={`optimistic-${i}`} className="flex items-end gap-2 justify-end">
                <div className="max-w-[75%]">
                  <p className="text-[11px] text-muted-foreground mb-1 text-right">{userName}</p>
                  <div className="rounded-2xl rounded-br-sm bg-primary/80 px-4 py-2.5">
                    <p className="text-sm text-primary-foreground">{text}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">იგზავნება...</p>
                </div>
                <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {(user?.firstName?.[0] || "მ").toUpperCase()}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isAuthenticated && (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-border">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="შეტყობინება..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors min-h-[44px] max-h-[120px]"
                data-testid="input-chat-message"
                style={{ height: "auto", overflowY: "auto" }}
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
