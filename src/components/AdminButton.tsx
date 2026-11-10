import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AdminButton() {
  const { user } = useAuth();
  if (!user?.is_admin) return null;

  return (
    <Button asChild variant="ghost" size="sm">
      <Link to="/admin">
        <Shield aria-hidden="true" /> Admin
      </Link>
    </Button>
  );
}
