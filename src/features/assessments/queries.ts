import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assessmentCollegeReview,
  createAssessment,
  finalReview,
  getAssessment,
  getAssessmentRules,
  handleAppeal,
  listAppeals,
  listAssessments,
  updateAssessmentRules,
} from "../../lib/api/endpoints/assessments";
import { searchMentors } from "../../lib/api/endpoints/mentors";
import type {
  AssessmentCollegeReviewBody,
  AssessmentQuery,
  CreateAssessmentBody,
  FinalReviewBody,
  HandleAppealBody,
  UpdateAssessmentRulesBody,
} from "../../lib/api/types";

export function useAssessments(params: AssessmentQuery) {
  return useQuery({
    queryKey: ["assessments", "list", params],
    queryFn: () => listAssessments(params),
  });
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: ["assessments", "detail", id],
    queryFn: () => getAssessment(id),
    enabled: Boolean(id),
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAssessmentBody) => createAssessment(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
      void queryClient.invalidateQueries({ queryKey: ["work-progress"] });
    },
  });
}

export function useAssessmentCollegeReview(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssessmentCollegeReviewBody) =>
      assessmentCollegeReview(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
      void queryClient.invalidateQueries({ queryKey: ["work-progress"] });
    },
  });
}

export function useFinalReview(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FinalReviewBody) => finalReview(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
      void queryClient.invalidateQueries({ queryKey: ["work-progress"] });
    },
  });
}

export function useAssessmentRules() {
  return useQuery({
    queryKey: ["assessments", "rules"],
    queryFn: getAssessmentRules,
    staleTime: 60_000,
  });
}

export function useUpdateAssessmentRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAssessmentRulesBody) =>
      updateAssessmentRules(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments", "rules"] });
    },
  });
}

export function useAppeals(
  assessmentId: string,
  params: { page?: number; pageSize?: number } = {},
) {
  return useQuery({
    queryKey: ["assessments", assessmentId, "appeals", params],
    queryFn: () => listAppeals(assessmentId, params),
    enabled: Boolean(assessmentId),
  });
}

export function useHandleAppeal(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appealId,
      body,
    }: {
      appealId: string;
      body: HandleAppealBody;
    }) => handleAppeal(assessmentId, appealId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

/** 已生效导师选项（用于新建考核、关联学生成果）。 */
export { useMentorOptions } from "../../lib/hooks/useMentorOptions";

/** 导师档案 ID → 姓名（列表展示用）。 */
export function useMentorNameMap() {
  const query = useQuery({
    queryKey: ["mentors", "name-map"],
    queryFn: () => searchMentors({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60_000,
  });
  const map = new Map<string, string>();
  for (const mentor of query.data?.list ?? []) {
    map.set(mentor.id, mentor.name);
  }
  return { map, query };
}
