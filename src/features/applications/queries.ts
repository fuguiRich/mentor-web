import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collegeReview,
  getApplication,
  listApplications,
  listMaterials,
  scReview,
} from "../../lib/api/endpoints/applications";
import type { ApplicationQuery, ReviewBody } from "../../lib/api/types";

export function useApplications(params: ApplicationQuery) {
  return useQuery({
    queryKey: ["applications", "list", params],
    queryFn: () => listApplications(params),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ["applications", "detail", id],
    queryFn: () => getApplication(id),
    enabled: Boolean(id),
  });
}

export function useMaterials(applicationId: string) {
  return useQuery({
    queryKey: ["applications", applicationId, "materials"],
    queryFn: () => listMaterials(applicationId),
    enabled: Boolean(applicationId),
  });
}

export type ReviewKind = "college" | "sc";

export function useReviewApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      kind,
      body,
    }: {
      id: string;
      kind: ReviewKind;
      body: ReviewBody;
    }) =>
      kind === "college" ? collegeReview(id, body) : scReview(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["work-progress"] });
    },
  });
}
