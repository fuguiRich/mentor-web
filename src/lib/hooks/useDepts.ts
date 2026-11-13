import { useQuery } from "@tanstack/react-query";
import { listDepts } from "../api/endpoints/system";

export function useDepts() {
  return useQuery({
    queryKey: ["depts", "tree"],
    queryFn: () => listDepts(),
    staleTime: 5 * 60_000,
  });
}
