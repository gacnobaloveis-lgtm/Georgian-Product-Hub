import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAdminStatus() {
  return useQuery<{ isAdmin: boolean; role: string | null }>({
    queryKey: ["/api/admin/status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/status", { credentials: "include" });
      if (!res.ok) return { isAdmin: false, role: null };
      return res.json();
    },
    staleTime: 30000,
  });
}

export function useAdminLogout() {
  const queryClient = useQueryClient();

  return async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    queryClient.setQueryData(["/api/admin/status"], { isAdmin: false });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
  };
}
