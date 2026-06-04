import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClubOption {
  id: string;
  name: string;
}

export function useClubs() {
  return useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name")
        .order("name")
        .returns<ClubOption[]>();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}
