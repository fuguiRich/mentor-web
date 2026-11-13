import { apiFetch } from "../client";
import type {
  MentorProfile,
  MentorSearchDetail,
  MentorSearchItem,
  MentorSearchQuery,
  Page,
  UpdateMentorProfileBody,
  Workbench,
} from "../types";

export function searchMentors(
  query: MentorSearchQuery = {},
): Promise<Page<MentorSearchItem>> {
  return apiFetch<Page<MentorSearchItem>>("/mentors", { query });
}

export function getMentor(id: string): Promise<MentorSearchDetail> {
  return apiFetch<MentorSearchDetail>(`/mentors/${id}`);
}

/** 创新创业学院管理员后台改导师填报字段（留痕）。 */
export function adminUpdateProfile(
  id: string,
  body: UpdateMentorProfileBody,
): Promise<MentorProfile> {
  return apiFetch<MentorProfile>(`/mentor/profiles/${id}`, {
    method: "PUT",
    body,
  });
}

export function getWorkbench(mentorId: string): Promise<Workbench> {
  return apiFetch<Workbench>(`/stats/workbench/${mentorId}`);
}
