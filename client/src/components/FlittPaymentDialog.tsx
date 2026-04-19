import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface FlittPaymentDialogProps {
  open: boolean;
  payUrl: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlittPaymentDialog({ open, payUrl, onClose, onSuccess }: FlittPaymentDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) setLoading(true);
  }, [open, payUrl]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data && typeof e.data === "object" && e.data.type === "flitt-payment-success") {
        onSuccess();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess]);

  function handleIframeLoad() {
    setLoading(false);
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const href = iframe.contentWindow?.location.href;
      if (href && href.includes("/payment/success")) {
        onSuccess();
      }
    } catch {
      // cross-origin – ignore (iframe still loading Flitt page)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="p-0 overflow-hidden gap-0 max-w-[95vw] sm:max-w-[420px] w-[420px] h-[640px] sm:rounded-2xl"
        data-testid="dialog-flitt-payment"
      >
        <DialogTitle className="sr-only">ბარათით გადახდა</DialogTitle>
        <DialogDescription className="sr-only">შეიყვანეთ ბარათის მონაცემები</DialogDescription>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {payUrl && (
          <iframe
            ref={iframeRef}
            src={payUrl}
            onLoad={handleIframeLoad}
            className="w-full h-full border-0"
            title="Flitt Payment"
            allow="payment"
            data-testid="iframe-flitt-payment"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
