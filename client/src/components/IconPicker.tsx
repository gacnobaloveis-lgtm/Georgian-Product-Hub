import * as LucideIcons from "lucide-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SITE_ICONS = [
  { path: "/icons/rod.png", label: "ჯოხი" },
  { path: "/icons/reel.png", label: "კოჭი" },
  { path: "/icons/line.png", label: "წნული" },
  { path: "/icons/wobbler.png", label: "ვობლერი" },
  { path: "/icons/spinner.png", label: "ტრიალა" },
  { path: "/icons/jig.png", label: "ყანყალი" },
  { path: "/icons/mormishing.png", label: "მორმიშინგი" },
  { path: "/icons/vest.png", label: "ჟილეტი" },
];

export function LucideIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  if (name.startsWith("/")) {
    return <img src={name} alt="" className={className + " object-contain"} />;
  }
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
}

interface IconPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string | null;
  onSelect: (iconName: string | null) => void;
}

export function IconPicker({ open, onOpenChange, value, onSelect }: IconPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>აიქონის არჩევა</DialogTitle>
        </DialogHeader>

        {value && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSelect(null);
                onOpenChange(false);
              }}
              data-testid="button-remove-icon"
            >
              <X className="h-4 w-4 mr-1" /> წაშლა
            </Button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 mt-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {SITE_ICONS.map((icon) => (
              <button
                key={icon.path}
                onClick={() => {
                  onSelect(icon.path);
                  onOpenChange(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors hover:bg-primary/10 ${
                  value === icon.path
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
                title={icon.label}
                data-testid={`icon-option-${icon.label}`}
              >
                <img src={icon.path} alt={icon.label} className="h-12 w-12 object-contain" />
                <span className="text-xs mt-2 font-medium">{icon.label}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
