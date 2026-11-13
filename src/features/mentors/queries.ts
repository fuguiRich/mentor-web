import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminUpdateProfile,
  getMentor,
  searchMentors,
} from "../../lib/api/endpoints/mentors";
import type {
  MentorSearchQuery,
  UpdateMentorProfileBody,
} from "../../lib/api/types";

export function useMentors(params: MentorSearchQuery) {
  return useQuery({
    queryKey: ["mentors", "list", params],
    queryFn: () => searchMentors(params),
  });
}

export function useMentor(id: string) {
  return useQuery({
    queryKey: ["mentors", "detail", id],
    queryFn: () => getMentor(id),
    enabled: Boolean(id),
  });
}

export function useUpdateMentorProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMentorProfileBody) => adminUpdateProfile(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentors"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
