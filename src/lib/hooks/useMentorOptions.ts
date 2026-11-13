import { useQuery } from "@tanstack/react-query";
import { searchMentors } from "../api/endpoints/mentors";

/** 已生效导师下拉选项；输入关键字在服务端检索。 */
export function useMentorOptions(keyword?: string) {
  return useQuery({
    queryKey: ["mentors", "options", keyword ?? ""],
    queryFn: () => searchMentors({ page: 1, pageSize: 100, keyword }),
    staleTime: 60_000,
  });
}