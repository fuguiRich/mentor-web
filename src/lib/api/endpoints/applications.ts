import { apiBlob, apiFetch } from "../client";
import type {
  ApplicationQuery,
  Material,
  MentorApplication,
  Page,
  ReviewBody,
} from "../types";

export function listApplications(
  query: ApplicationQuery = {},
): Promise<Page<MentorApplication>> {
  return apiFetch<Page<MentorApplication>>("/mentor-applications", { query });
}

export function getApplication(id: string): Promise<MentorApplication> {
  return apiFetch<MentorApplication>(`/mentor-applications/${id}`);
}

export function collegeReview(
  id: string,
  body: ReviewBody,
): Promise<MentorApplication> {
  return apiFetch<MentorApplication>(
    `/mentor-applications/${id}/college-review`,
    { method: "POST", body },
  );
}

export function scReview(
  id: string,
  body: ReviewBody,
): Promise<MentorApplication> {
  return apiFetch<MentorApplication>(`/mentor-applications/${id}/sc-review`, {
    method: "POST",
    body,
  });
}

export function listMaterials(id: string): Promise<Page<Material>> {
  return apiFetch<Page<Material>>(`/mentor-applications/${id}/materials`);
}

export function previewMaterial(id: string, materialId: string) {
  return apiBlob(
    `/mentor-applications/${id}/materials/${materialId}/preview`,
  );
}

export function downloadMaterial(id: string, materialId: string) {
  return apiBlob(
    `/mentor-applications/${id}/materials/${materialId}/download`,
  );
}
