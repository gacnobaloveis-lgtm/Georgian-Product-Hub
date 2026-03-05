import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const POPULAR_ICONS = [
  "Fish", "Anchor", "Ship", "Waves", "ShoppingCart", "ShoppingBag",
  "Package", "Box", "Tag", "Tags", "Star", "Heart", "Zap", "Award",
  "Trophy", "Target", "Crosshair", "MapPin", "Compass", "Navigation",
  "Sun", "CloudRain", "Thermometer", "Wind", "Droplets", "Mountain",
  "TreePine", "Tent", "Flame", "Flashlight", "Binoculars", "Camera",
  "Ruler", "Scale", "Timer", "Clock", "Calendar", "Bookmark",
  "Gift", "Truck", "Store", "CreditCard", "Wallet", "BadgePercent",
  "CircleDollarSign", "HandCoins", "Percent", "BarChart3", "TrendingUp",
  "Users", "User", "Shield", "Lock", "Eye", "Bell", "MessageCircle",
  "Phone", "Mail", "Globe", "Link", "Settings", "Wrench", "Hammer",
  "Scissors", "Pocket", "Backpack", "Shirt", "Footprints", "Bug",
  "Leaf", "Flower2", "Sprout", "Apple", "Cherry", "Grape",
  "Beef", "Egg", "Cookie", "IceCreamCone", "Coffee", "Wine",
  "Sparkles", "Crown", "Gem", "Diamond", "Rocket", "Bolt",
  "CircleCheck", "CircleX", "Info", "AlertTriangle", "HelpCircle",
  "Home", "Building", "Warehouse", "Factory", "Palette", "Paintbrush",
];

function getAllIconNames(): string[] {
  return Object.keys(LucideIcons).filter((key) => {
    if (key === "default" || key === "createLucideIcon" || key === "icons") return false;
    if (key[0] !== key[0].toUpperCase()) return false;
    const val = (LucideIcons as any)[key];
    return typeof val === "function" || (typeof val === "object" && val?.render);
  });
}

function renderIcon(name: string, className = "h-5 w-5") {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
}

export function LucideIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  if (name.startsWith("/uploads/")) {
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
  const [search, setSearch] = useState("");

  const allIcons = useMemo(() => getAllIconNames(), []);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return POPULAR_ICONS.filter((n) => allIcons.includes(n));
    const q = search.toLowerCase();
    return allIcons.filter((name) => name.toLowerCase().includes(q));
  }, [search, allIcons]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>აიქონის არჩევა</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ძიება..."
              className="pl-9"
              data-testid="input-icon-search"
            />
          </div>
          {value && (
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
          )}
        </div>

        <div className="overflow-y-auto flex-1 mt-2">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
            {filteredIcons.slice(0, 200).map((name) => (
              <button
                key={name}
                onClick={() => {
                  onSelect(name);
                  onOpenChange(false);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors hover:bg-primary/10 ${
                  value === name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                title={name}
                data-testid={`icon-option-${name}`}
              >
                {renderIcon(name, "h-5 w-5")}
                <span className="text-[9px] mt-1 truncate w-full text-center leading-tight">{name}</span>
              </button>
            ))}
          </div>
          {filteredIcons.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">აიქონი ვერ მოიძებნა</p>
          )}
          {filteredIcons.length > 200 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              ნაჩვენებია 200 / {filteredIcons.length} — დააზუსტეთ ძიება
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
