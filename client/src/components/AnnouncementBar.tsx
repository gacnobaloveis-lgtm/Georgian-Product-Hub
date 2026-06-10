import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";

export function AnnouncementBar() {
  const { data } = useQuery<{ enabled: boolean; text: string }>({
    queryKey: ["/api/announcement"],
    staleTime: 60_000,
  });

  if (!data?.enabled || !data.text?.trim()) return null;

  return (
    <div
      className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 shadow-md"
      role="status"
      data-testid="bar-announcement"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-3 py-2 text-center text-sm font-semibold sm:text-base">
        <Megaphone className="h-4 w-4 shrink-0" />
        <span data-testid="text-announcement">{data.text}</span>
      </div>
    </div>
  );
}
