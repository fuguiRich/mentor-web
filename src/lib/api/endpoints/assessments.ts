import { apiBlob, apiFetch } from "../client";
import type {
  Appeal,
  Assessment,
  AssessmentCollegeReviewBody,
  AssessmentQuery,
  AssessmentRules,
  CreateAppealBody,
  CreateAssessmentBody,
  FinalReviewBody,
  HandleAppealBody,
  Page,
  UpdateAssessmentRulesBody,
} from "../types";

export function listAssessments(
  query: AssessmentQuery = {},
): Promise<Page<Assessment>> {
  return apiFetch<Page<Assessment>>("/assessments", { query });
}

export function getAssessment(id: string): Promise<Assessment> {
  return apiFetch<Assessment>(`/assessments/${id}`);
}

export function createAssessment(
  body: CreateAssessmentBody,
): Promise<Assessment> {
  return apiFetch<Assessment>("/assessments", { method: "POST", body });
}

export function assessmentCollegeReview(
  id: string,
  body: AssessmentCollegeReviewBody,
): Promise<Assessment> {
  return apiFetch<Assessment>(`/assessments/${id}/college-review`, {
    method: "POST",
    body,
  });
}

export function finalReview(
  id: string,
  body: FinalReviewBody,
): Promise<Assessment> {
  return apiFetch<Assessment>(`/assessments/${id}/final-review`, {
    method: "POST",
    body,
  });
}

export function getAssessmentRules(): Promise<AssessmentRules> {
  return apiFetch<AssessmentRules>("/assessments/rules");
}

export function updateAssessmentRules(
  body: UpdateAssessmentRulesBody,
): Promise<AssessmentRules> {
  return apiFetch<AssessmentRules>("/assessments/rules", {
    method: "PUT",
    body,
  });
}

export function listAppeals(
  assessmentId: string,
  query: { page?: number; pageSize?: number } = {},
): Promise<Page<Appeal>> {
  return apiFetch<Page<Appeal>>(`/assessments/${assessmentId}/appeals`, {
    query,
  });
}

/** 导师对已生效考核提交申诉。 */
export function createAppeal(
  assessmentId: string,
  body: CreateAppealBody,
): Promise<Appeal> {
  return apiFetch<Appeal>(`/assessments/${assessmentId}/appeals`, {
    method: "POST",
    body,
  });
}

export function handleAppeal(
  assessmentId: string,
  appealId: string,
  body: HandleAppealBody,
): Promise<Appeal> {
  return apiFetch<Appeal>(
    `/assessments/${assessmentId}/appeals/${appealId}/handle`,
    { method: "POST", body },
  );
}

export function previewAppealFile(
  assessmentId: string,
  appealId: string,
  fileId: string,
) {
  return apiBlob(
    `/assessments/${assessmentId}/appeals/${appealId}/files/${fileId}/preview`,
  );
}

export function downloadAppealFile(
  assessmentId: string,
  appealId: string,
  fileId: string,
) {
  return apiBlob(
    `/assessments/${assessmentId}/appeals/${appealId}/files/${fileId}/download`,
  );
}
