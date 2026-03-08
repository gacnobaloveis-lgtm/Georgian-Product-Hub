import { useState, useEffect } from "react";
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
import { Loader2, UserPlus, LogIn, Eye, EyeOff, ScrollText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { TermsSection } from "@shared/schema";

const GEORGIAN_CITIES = [
  "თბილისი", "ქუთაისი", "ბათუმი", "რუსთავი", "ფოთი", "ზუგდიდი",
  "გორი", "თელავი", "ახალციხე", "ოზურგეთი", "სენაკი", "ხაშური",
  "სამტრედია", "მარნეული", "ქობულეთი", "წყალტუბო", "საგარეჯო",
  "გარდაბანი", "ბოლნისი", "ზესტაფონი",
];

const REMEMBER_KEY = "spiningebi_remember_phone";

interface AuthLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered?: () => void;
}

export function AuthLoginDialog({ open, onOpenChange, onRegistered }: AuthLoginDialogProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({ phone: "", password: "", remember: false });
  const [regForm, setRegForm] = useState({ fullName: "", city: "", address: "", phone: "", password: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsViewOpen, setTermsViewOpen] = useState(false);

  const { data: termsSections = [] } = useQuery<TermsSection[]>({
    queryKey: ["/api/terms-sections"],
    enabled: termsViewOpen,
  });

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setLoginForm(prev => ({ ...prev, phone: saved, remember: true }));
        setMode("login");
      }
    }
  }, [open]);

  async function handleLogin() {
    if (!loginForm.phone.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ ტელეფონის ნომერი" });
      return;
    }
    if (!loginForm.password) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ პაროლი" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/login/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: loginForm.phone.trim(), password: loginForm.password }),
      });

      if (res.ok) {
        if (loginForm.remember) {
          localStorage.setItem(REMEMBER_KEY, loginForm.phone.trim());
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        toast({ title: "წარმატებით შეხვედით!" });
        onOpenChange(false);
        onRegistered?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "შეცდომა", description: data.message || "შესვლა ვერ მოხერხდა" });
      }
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    const nameParts = regForm.fullName.trim().split(/\s+/);
    if (nameParts.length < 2 || !nameParts[0] || !nameParts[1]) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ სახელი და გვარი" });
      return;
    }
    if (!regForm.city) {
      toast({ variant: "destructive", title: "შეცდომა", description: "აირჩიეთ ქალაქი" });
      return;
    }
    if (!regForm.address.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ მისამართი" });
      return;
    }
    if (!regForm.phone.trim()) {
      toast({ variant: "destructive", title: "შეცდომა", description: "შეიყვანეთ ტელეფონის ნომერი" });
      return;
    }
    if (!regForm.password || regForm.password.length < 4) {
      toast({ variant: "destructive", title: "შეცდომა", description: "პაროლი მინიმუმ 4 სიმბოლო უნდა იყოს" });
      return;
    }
    if (!agreedToTerms) {
      toast({ variant: "destructive", title: "შეცდომა", description: "გთხოვთ დაეთანხმოთ წესებს და პირობებს" });
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
          city: regForm.city,
          address: regForm.address.trim(),
          phone: regForm.phone.trim(),
          password: regForm.password,
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
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg" data-testid="text-auth-title">
            {mode === "login" ? "შესვლა" : "რეგისტრაცია"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "შეიყვანეთ თქვენი მონაცემები" : "შეავსეთ თქვენი მონაცემები"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex rounded-lg border border-border overflow-hidden mb-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
            data-testid="tab-login"
          >
            შესვლა
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "register" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
            data-testid="tab-register"
          >
            რეგისტრაცია
          </button>
        </div>

        {mode === "login" ? (
          <div className="flex flex-col gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">ტელეფონი</label>
              <Input
                value={loginForm.phone}
                onChange={e => setLoginForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+995 5XX XXX XXX"
                className="min-h-[44px]"
                data-testid="input-login-phone"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">პაროლი</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="პაროლი"
                  className="min-h-[44px] pr-10"
                  data-testid="input-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={loginForm.remember}
                onChange={e => setLoginForm(prev => ({ ...prev, remember: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
                data-testid="checkbox-remember"
              />
              <span className="text-xs text-muted-foreground">დამიმახსოვრე</span>
            </label>

            <Button
              onClick={handleLogin}
              disabled={submitting}
              className="min-h-[44px] w-full mt-1"
              data-testid="button-login-submit"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> მიმდინარეობს...</>
              ) : (
                <><LogIn className="mr-2 h-4 w-4" /> შესვლა</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              არ გაქვთ ანგარიში?{" "}
              <button type="button" onClick={() => setMode("register")} className="text-primary font-medium hover:underline" data-testid="link-to-register">
                დარეგისტრირდით
              </button>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">სახელი და გვარი</label>
              <Input
                value={regForm.fullName}
                onChange={e => setRegForm(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="სახელი გვარი"
                className="min-h-[44px]"
                data-testid="input-register-fullname"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">ქალაქი</label>
              <Select value={regForm.city} onValueChange={v => setRegForm(prev => ({ ...prev, city: v }))}>
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
                value={regForm.address}
                onChange={e => setRegForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="ქუჩა, ბინა, რაიონი"
                className="min-h-[44px]"
                data-testid="input-register-address"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">ტელეფონი</label>
              <Input
                value={regForm.phone}
                onChange={e => setRegForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+995 5XX XXX XXX"
                className="min-h-[44px]"
                data-testid="input-register-phone"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">პაროლი</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={regForm.password}
                  onChange={e => setRegForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="მინ. 4 სიმბოლო"
                  className="min-h-[44px] pr-10"
                  data-testid="input-register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-password-reg"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-border accent-primary flex-shrink-0"
                  data-testid="checkbox-agree-terms"
                />
                <span className="text-xs text-muted-foreground leading-tight">
                  ვეთანხმები{" "}
                  <button
                    type="button"
                    onClick={() => setTermsViewOpen(true)}
                    className="text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                    data-testid="button-view-terms-register"
                  >
                    <ScrollText className="h-3 w-3" />
                    წესებს და პირობებს
                  </button>
                </span>
              </label>
            </div>

            <Button
              onClick={handleRegister}
              disabled={submitting || !agreedToTerms}
              className="min-h-[44px] w-full mt-1"
              data-testid="button-register-submit"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> მიმდინარეობს...</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" /> რეგისტრაცია</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              უკვე გაქვთ ანგარიში?{" "}
              <button type="button" onClick={() => setMode("login")} className="text-primary font-medium hover:underline" data-testid="link-to-login">
                შესვლა
              </button>
            </p>
          </div>
        )}
      </DialogContent>

      <Dialog open={termsViewOpen} onOpenChange={setTermsViewOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg" data-testid="text-terms-title-register">
              <ScrollText className="inline h-5 w-5 mr-2" />
              წესები & პირობები
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              გაეცანით წესებს რეგისტრაციის წინ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2" data-testid="terms-content-register">
            {termsSections.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                წესები და პირობები ჯერ არ არის დამატებული
              </p>
            ) : (
              termsSections.map((section) => (
                <div key={section.id} className="space-y-1">
                  <h3 className="text-base font-bold" data-testid={`terms-title-${section.id}`}>{section.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`terms-content-${section.id}`}>{section.content}</p>
                </div>
              ))
            )}
          </div>
          <Button
            onClick={() => {
              setAgreedToTerms(true);
              setTermsViewOpen(false);
            }}
            className="w-full mt-2"
            data-testid="button-accept-terms"
          >
            ვეთანხმები
          </Button>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
