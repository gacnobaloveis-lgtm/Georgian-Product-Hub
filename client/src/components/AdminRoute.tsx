import { useAdminStatus } from "@/hooks/use-admin";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  component: React.ComponentType;
}

export function AdminRoute({ component: Component }: AdminRouteProps) {
  const { data, isLoading } = useAdminStatus();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.isAdmin) {
    return <Redirect to="/admin-login" />;
  }

  return <Component />;
}
