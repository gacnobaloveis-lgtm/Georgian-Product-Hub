import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SiGoogle, SiFacebook } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";

interface AuthLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string;
}

export function AuthLoginDialog({ open, onOpenChange, returnTo = "/" }: AuthLoginDialogProps) {
  const { data: methods } = useQuery<{ google: boolean; facebook: boolean }>({
    queryKey: ["/api/auth/methods"],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">ავტორიზაცია</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            აირჩიეთ ავტორიზაციის მეთოდი
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          {methods?.google !== false && (
            <a
              href={`/api/login?returnTo=${encodeURIComponent(returnTo)}`}
              className="flex items-center justify-center gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-gray-50"
              data-testid="button-login-google"
            >
              <SiGoogle className="h-5 w-5 text-[#4285F4]" />
              Google-ით ავტორიზაცია
            </a>
          )}
          {methods?.facebook !== false && (
            <a
              href={`/api/login/facebook?returnTo=${encodeURIComponent(returnTo)}`}
              className="flex items-center justify-center gap-3 rounded-lg border border-border bg-[#1877F2] px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#166FE5]"
              data-testid="button-login-facebook"
            >
              <SiFacebook className="h-5 w-5" />
              Facebook-ით ავტორიზაცია
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
