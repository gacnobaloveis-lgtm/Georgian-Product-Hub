import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, ShoppingBag, Home } from "lucide-react";

interface PaymentSuccessDialogProps {
  open: boolean;
  onGoHome: () => void;
  onGoOrders: () => void;
}

export function PaymentSuccessDialog({ open, onGoHome, onGoOrders }: PaymentSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-sm p-6 text-center"
        data-testid="dialog-payment-success"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 p-4">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
          </div>
        </div>
        <DialogTitle className="text-xl font-bold">გადახდა წარმატებულია!</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          თქვენი შეკვეთა მიღებულია. მადლობა შეძენისთვის!
        </DialogDescription>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button
            onClick={onGoOrders}
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
            data-testid="button-success-orders"
          >
            <ShoppingBag className="h-4 w-4" />
            ჩემი შეკვეთები
          </Button>
          <Button
            variant="outline"
            onClick={onGoHome}
            className="flex-1 gap-2"
            data-testid="button-success-home"
          >
            <Home className="h-4 w-4" />
            მთავარი
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
