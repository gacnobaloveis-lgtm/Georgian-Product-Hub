import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const GEORGIAN_CITIES = [
  "თბილისი", "ქუთაისი", "ბათუმი", "რუსთავი", "ფოთი", "ზუგდიდი",
  "გორი", "თელავი", "ახალციხე", "ოზურგეთი", "სენაკი", "ხაშური",
  "სამტრედია", "მარნეული", "ქობულეთი", "წყალტუბო", "საგარეჯო",
  "გარდაბანი", "ბოლნისი", "ზესტაფონი",
];

interface AuthLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string;
  onRegistered?: () => void;
}

export function AuthLoginDialog({ open, onOpenChange, onRegistered }: AuthLoginDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    city: "",
    address: "",
    phone: "",
  });

  async function handleSubmit() {
    const nameParts = form.fullName.trim().split(/\s+/);
    if (nameParts.length < 2 || !nameParts[0] || !nameParts[1]) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ სახელი და გვარი" });
      return;
    }
    if (!form.city) {
      toast({ variant: "destructive", title: "შეცდომა", description: "აირჩიეთ ქალაქი" });
      return;
    }
    if (!form.address.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ მისამართი" });
      return;
    }
    if (!form.phone.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ ტელეფონის ნომერი" });
      return;
    }

    setSubmitting(true);
    try {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName,
          lastName,
          city: form.city,
          address: form.address.trim(),
          phone: form.phone.trim(),
        }),
      });

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        toast({ title: "რეგისტრაცია წარმატებით დასრულდა!" });
        onOpenChange(false);
        onRegistered?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "შეცდომა", description: data.message || "რეგისტრაცია ვერ მოხერხდა" });
      }
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg" data-testid="text-register-title">რეგისტრაცია</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            შეავსეთ თქვენი მონაცემები
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">სახელი და გვარი</label>
            <Input
              value={form.fullName}
              onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="სახელი გვარი"
              className="min-h-[44px]"
              data-testid="input-register-fullname"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">ქალაქი</label>
            <Select value={form.city} onValueChange={v => setForm(prev => ({ ...prev, city: v }))}>
              <SelectTrigger className="min-h-[44px]" data-testid="select-register-city">
                <SelectValue placeholder="აირჩიეთ ქალაქი" />
              </SelectTrigger>
              <SelectContent>
                {GEORGIAN_CITIES.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">მისამართი</label>
            <Input
              value={form.address}
              onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="ქუჩა, ბინა, რაიონი"
              className="min-h-[44px]"
              data-testid="input-register-address"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">ტელეფონი</label>
            <Input
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+995 5XX XXX XXX"
              className="min-h-[44px]"
              data-testid="input-register-phone"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="min-h-[44px] w-full mt-1"
            data-testid="button-register-submit"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> მიმდინარეობს...</>
            ) : (
              <><UserPlus className="mr-2 h-4 w-4" /> რეგისტრაცია</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
