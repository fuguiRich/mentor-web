import { apiBlob, apiFetch } from "../client";
import type {
  CreateStudentAchievementBody,
  Page,
  StudentAchievement,
  StudentAchievementQuery,
  StudentOption,
  StudentOptionQuery,
} from "../types";

export function listStudentAchievements(
  query: StudentAchievementQuery = {},
): Promise<Page<StudentAchievement>> {
  return apiFetch<Page<StudentAchievement>>("/student-achievements", {
    query,
  });
}

/** 学生下拉目录：按姓名 / 学号搜索，数据范围由后端限制。 */
export function listStudentOptions(
  query: StudentOptionQuery = {},
): Promise<Page<StudentOption>> {
  return apiFetch<Page<StudentOption>>("/student-achievements/students", {
    query,
  });
}

export function createStudentAchievement(
  body: CreateStudentAchievementBody,
): Promise<StudentAchievement> {
  return apiFetch<StudentAchievement>("/student-achievements", {
    method: "POST",
    body,
  });
}

export function linkStudentAchievement(
  id: string,
  body: { mentorProfileId: string },
): Promise<StudentAchievement> {
  return apiFetch<StudentAchievement>(`/student-achievements/${id}/link`, {
    method: "PATCH",
    body,
  });
}

export function deleteStudentAchievement(id: string): Promise<void> {
  return apiFetch<void>(`/student-achievements/${id}`, { method: "DELETE" });
}

export function previewStudentAchievementProof(id: string) {
  return apiBlob(`/student-achievements/${id}/proof/preview`);
}

export function downloadStudentAchievementProof(id: string) {
  return apiBlob(`/student-achievements/${id}/proof/download`);
}
