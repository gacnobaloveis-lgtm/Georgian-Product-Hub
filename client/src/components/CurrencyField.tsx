import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CurrencyField({
  value,
  onChange,
  placeholder,
  id,
  name,
  required,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  name?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        required={required}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        className={cn("pl-11")}
      />
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <Badge variant="secondary" className="border border-muted-border bg-muted/70 text-foreground">
          ₾
        </Badge>
      </div>
    </div>
  );
}
