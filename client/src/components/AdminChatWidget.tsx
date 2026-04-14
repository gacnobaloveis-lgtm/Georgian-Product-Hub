import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminStatus } from "@/hooks/use-admin";
import { queryClient } from "@/lib/queryClient";
import { playMessageSound } from "@/lib/notification-sound";

type ConvMsg = { id: number; userId: string; message: string; senderType: string; createdAt: string | null };
type Conv = { userId: string; firstName: string | null; lastName: string | null; lastMessage: string; lastAt: string | null; unread: number };

function fmtTime(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const isToday = dt.toDateString() === now.toDateString();
  return isToday
    ? dt.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })
    : dt.toLocaleDateString("ka-GE", { day: "2-digit", month: "2-digit" }) + " " +
      dt.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
}

export function AdminChatWidget() {
  const { data: adminStatus } = useAdminStatus();
  const isAdmin = adminStatus?.isAdmin;

  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery<Conv[]>({
    queryKey: ["/api/chat/conversations"],
    enabled: !!isAdmin,
    refetchInterval: isAdmin ? 5000 : false,
  });

  const { data: messages = [] } = useQuery<ConvMsg[]>({
    queryKey: ["/api/chat/messages", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/messages/${selectedUserId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!isAdmin && !!selectedUserId,
    refetchInterval: 4000,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const res = await fetch(`/api/chat/reply/${userId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Reply failed");
      return res.json() as Promise<ConvMsg>;
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData<ConvMsg[]>(["/api/chat/messages", selectedUserId], (old = []) => {
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      setReplyText("");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const prevUnreadRef = useRef(0);
  useEffect(() => {
    const total = conversations.reduce((s, c) => s + (c.unread || 0), 0);
    if (total > prevUnreadRef.current) {
      playMessageSound();
    }
    prevUnreadRef.current = total;
  }, [conversations]);

  function handleSend() {
    if (!replyText.trim() || !selectedUserId || replyMutation.isPending) return;
    replyMutation.mutate({ userId: selectedUserId, message: replyText.trim() });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleOpen() {
    setOpen(true);
    setSelectedUserId(null);
  }

  function handleClose() {
    setOpen(false);
    setSelectedUserId(null);
    setReplyText("");
  }

  if (!isAdmin) return null;

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const selectedConv = conversations.find((c) => c.userId === selectedUserId);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
        data-testid="button-admin-chat-widget"
        title="LIVE კონტაქტი — ადმინი"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex flex-col w-full sm:w-[420px] sm:bottom-6 sm:right-6 sm:rounded-2xl overflow-hidden shadow-2xl border border-border bg-white"
          style={{ height: "min(80vh, 640px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white shrink-0">
            {selectedUserId ? (
              <button
                onClick={() => { setSelectedUserId(null); setReplyText(""); }}
                className="flex items-center gap-1 text-sm text-white/90 hover:text-white transition-colors"
                data-testid="button-widget-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <MessageCircle className="h-5 w-5" />
            )}
            <div className="flex-1 min-w-0">
              {selectedUserId ? (
                <p className="font-semibold text-sm truncate">
                  {selectedConv?.firstName || ""} {selectedConv?.lastName || ""}
                </p>
              ) : (
                <p className="font-semibold text-sm">
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">LIVE</span>
                  კონტაქტი
                </p>
              )}
            </div>
            {!selectedUserId && totalUnread > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold text-white">
                {totalUnread}
              </span>
            )}
            <button
              onClick={handleClose}
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              data-testid="button-widget-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col flex-1 min-h-0">
            {selectedUserId ? (
              /* Thread view */
              <>
                <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
                  {messages.map((msg) => {
                    const isUser = msg.senderType === "user";
                    const isAdmin = msg.senderType === "admin";
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isUser ? "" : "justify-end"}`}>
                        {isUser && (
                          <div className="h-6 w-6 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {(selectedConv?.firstName?.[0] || "მ").toUpperCase()}
                          </div>
                        )}
                        <div className="max-w-[75%]">
                          <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                            isUser
                              ? "bg-gray-100 rounded-bl-sm text-gray-800"
                              : isAdmin
                                ? "bg-emerald-600 text-white rounded-br-sm"
                                : "bg-blue-50 border border-blue-100 rounded-bl-sm text-blue-800"
                          }`}>
                            {msg.message}
                          </div>
                          <p className={`text-[10px] text-muted-foreground mt-0.5 ${isUser ? "" : "text-right"}`}>
                            {fmtTime(msg.createdAt)}
                          </p>
                        </div>
                        {!isUser && (
                          <div className="h-6 w-6 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                            SP
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {replyMutation.isPending && (
                    <div className="flex items-end gap-2 justify-end opacity-60">
                      <div className="max-w-[75%]">
                        <div className="rounded-2xl rounded-br-sm bg-emerald-600 px-3.5 py-2.5 text-sm text-white">...</div>
                      </div>
                      <div className="h-6 w-6 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">SP</div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Reply input */}
                <div className="flex items-end gap-2 p-3 border-t border-border shrink-0 bg-white">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="პასუხი... (Enter — გაგზავნა)"
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"
                    data-testid="input-widget-reply"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 shrink-0"
                    data-testid="button-widget-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              /* Conversations list */
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 opacity-30" />
                    <p className="text-sm">შეტყობინებები არ არის</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.userId}
                      onClick={() => setSelectedUserId(conv.userId)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:shadow-sm ${
                        conv.unread > 0
                          ? "bg-red-50 border border-red-100 hover:border-red-200"
                          : "bg-gray-50 border border-transparent hover:border-gray-200"
                      }`}
                      data-testid={`button-widget-conv-${conv.userId}`}
                    >
                      <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                        conv.unread > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {(conv.firstName?.[0] || "მ").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {conv.firstName || ""} {conv.lastName || ""}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {conv.lastAt && (
                              <span className="text-[10px] text-muted-foreground">{fmtTime(conv.lastAt)}</span>
                            )}
                            {conv.unread > 0 && (
                              <span className="flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {conv.unread}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {conv.lastMessage}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
