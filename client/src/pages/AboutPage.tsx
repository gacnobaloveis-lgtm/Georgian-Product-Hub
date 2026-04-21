import { useLocation } from "wouter";
import { Fish, MapPin, Phone, Mail, Clock, ArrowLeft, ShieldCheck, Truck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => setLocation("/")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-about"
        >
          <ArrowLeft className="h-4 w-4" />
          მთავარი
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Fish className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ჩვენს შესახებ</h1>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 text-base font-bold text-foreground">ვინ ვართ</h2>
            <p className="text-[15px] leading-7 text-muted-foreground">
              spiningebi.ge ონლაინ მაღაზია. ჩვენ ვთავაზობთ მეთევზეებს საუკეთესო სპინინგის ჯოხებს, კოჭებს, წნულებს, ვობლერებს და სხვა სათევზაო აქსესუარებს საუკეთესო ფასებად.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
              <h3 className="font-bold text-foreground mb-1">ხარისხი</h3>
              <p className="text-sm text-muted-foreground">მაღალი უკვე გამოცდილი სპინინგისტებისგან</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <Truck className="mx-auto mb-3 h-8 w-8 text-blue-500" />
              <h3 className="font-bold text-foreground mb-1">მიწოდება</h3>
              <p className="text-sm text-muted-foreground">მიტანა საქართველოს ყველა კუთხეში</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <Star className="mx-auto mb-3 h-8 w-8 text-amber-500" />
              <h3 className="font-bold text-foreground mb-1">გამოცდილება</h3>
              <p className="text-sm text-muted-foreground">წლების გამოცდილება სათევზაო ინდუსტრიაში</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-base font-bold text-foreground">საკონტაქტო ინფორმაცია</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <a href="tel:+995599523351" className="hover:text-foreground transition-colors">+995 599 52 33 51</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a href="mailto:spiningebi@gmail.com" className="hover:text-foreground transition-colors">spiningebi@gmail.com</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>საქართველო, ქუთაისი</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>კვირის ყველა დღე: 00:00 – 24:00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            მთავარ გვერდზე დაბრუნება
          </Button>
        </div>
      </div>
    </div>
  );
}
