import { useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { AnimatedShell } from "@/components/AnimatedShell";
import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminStatus } from "@/hooks/use-admin";
import { queryClient } from "@/lib/queryClient";
import { Lock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function AdminLogin() {
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: adminStatus } = useAdminStatus();

  if (adminStatus?.isAdmin) {
    return <Redirect to="/admin-dashboard" />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!secretKey.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: secretKey.trim() }),
        credentials: "include",
      });

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
        toast({ title: "წარმატება", description: "ავტორიზაცია წარმატებით გაიარეთ" });
        setLocation("/admin-dashboard");
      } else {
        const data = await res.json();
        toast({ variant: "destructive", title: "შეცდომა", description: data.message || "არასწორი გასაღები" });
      }
    } catch {
      toast({ variant: "destructive", title: "შეცდომა", description: "კავშირის შეცდომა" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh px-4">
      <AnimatedShell className="w-full max-w-sm">
        <GlassPanel className="p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">ადმინ პანელი</h1>
            <p className="text-sm text-muted-foreground">შეიყვანეთ ადმინის გასაღები</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="ადმინის გასაღები..."
              className="min-h-[44px]"
              autoFocus
              data-testid="input-admin-key"
            />
            <Button type="submit" disabled={loading || !secretKey.trim()} className="min-h-[44px] w-full" data-testid="button-admin-login">
              {loading ? "შემოწმება..." : "შესვლა"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-900" data-testid="link-back-home">
                <ArrowLeft className="h-3.5 w-3.5" />
                მთავარზე დაბრუნება
              </span>
            </Link>
          </div>
        </GlassPanel>
      </AnimatedShell>
    </div>
  );
}
