import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api";

export const ME_KEY = ["me"] as const;

export function useAuth() {
  const me = useQuery({ queryKey: ME_KEY, queryFn: () => getMe(), staleTime: 60_000 });
  return { user: me.data ?? null, loading: me.isLoading };
}
