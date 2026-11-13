import { apiBlob, apiFetch } from "../client";
import type {
  Achievement,
  AchievementQuery,
  CreateAchievementBody,
  CreateSlotBody,
  FileObject,
  Material,
  MentorApplication,
  MentorProfile,
  MentorRecord,
  MentorRecordQuery,
  Page,
  PageParams,
  ReviewList,
  TimeSlot,
  UpdateAchievementBody,
  UpdateMentorProfileBody,
  UpdateSlotBody,
} from "../types";

// ---------- 我的档案 ----------

export function getMyProfile(): Promise<MentorProfile> {
  return apiFetch<MentorProfile>("/mentor/profile");
}

export function updateMyProfile(
  body: UpdateMentorProfileBody,
): Promise<MentorProfile> {
  return apiFetch<MentorProfile>("/mentor/profile", { method: "PUT", body });
}

/** 单独维护联系电话；null = 清除覆盖，回退到同步源手机号。 */
export function updateMyContact(
  contactMobile: string | null,
): Promise<MentorProfile> {
  return apiFetch<MentorProfile>("/mentor/profile/contact", {
    method: "PUT",
    body: { contactMobile },
  });
}

// ---------- 我的申请 ----------

export function listMyApplications(
  query: PageParams & { status?: number; type?: number } = {},
): Promise<Page<MentorApplication>> {
  return apiFetch<Page<MentorApplication>>("/mentor-applications", { query });
}

export function getMyApplication(id: string): Promise<MentorApplication> {
  return apiFetch<MentorApplication>(`/mentor-applications/${id}`);
}

/** 提交入驻申请（空 body，载荷由服务端按当前档案生成）。 */
export function submitOnboarding(): Promise<MentorApplication> {
  return apiFetch<MentorApplication>("/mentor-applications", {
    method: "POST",
    body: {},
  });
}

/** 已生效档案提交信息修改申请（增量字段）。 */
export function submitProfileChange(
  body: UpdateMentorProfileBody,
): Promise<MentorApplication> {
  return apiFetch<MentorApplication>(
    "/mentor-applications/profile-change",
    { method: "POST", body },
  );
}

export function withdrawMyApplication(id: string): Promise<MentorApplication> {
  return apiFetch<MentorApplication>(
    `/mentor-applications/${id}/withdraw`,
    { method: "POST", body: {} },
  );
}

// ---------- 申请佐证材料 ----------

export function listMyMaterials(id: string): Promise<Page<Material>> {
  return apiFetch<Page<Material>>(`/mentor-applications/${id}/materials`);
}

export function attachMyMaterial(
  id: string,
  body: { fileId: string; kind: number },
): Promise<Material> {
  return apiFetch<Material>(`/mentor-applications/${id}/materials`, {
    method: "POST",
    body,
  });
}

export function removeMyMaterial(
  id: string,
  materialId: string,
): Promise<void> {
  return apiFetch<void>(
    `/mentor-applications/${id}/materials/${materialId}`,
    { method: "DELETE" },
  );
}

export function previewMyMaterial(id: string, materialId: string) {
  return apiBlob(
    `/mentor-applications/${id}/materials/${materialId}/preview`,
  );
}

export function downloadMyMaterial(id: string, materialId: string) {
  return apiBlob(
    `/mentor-applications/${id}/materials/${materialId}/download`,
  );
}

// ---------- 文件上传 ----------

export function uploadFiles(
  files: File[],
  owner?: { ownerType?: string; ownerId?: string },
): Promise<FileObject[]> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  if (owner?.ownerType) form.append("ownerType", owner.ownerType);
  if (owner?.ownerId) form.append("ownerId", owner.ownerId);
  return apiFetch<FileObject[]>("/files", { method: "POST", body: form });
}

// ---------- 可指导时段 ----------

export function listSlots(): Promise<Page<TimeSlot>> {
  return apiFetch<Page<TimeSlot>>("/mentor/slots");
}

export function createSlot(body: CreateSlotBody): Promise<TimeSlot> {
  return apiFetch<TimeSlot>("/mentor/slots", { method: "POST", body });
}

export function updateSlot(
  id: string,
  body: UpdateSlotBody,
): Promise<TimeSlot> {
  return apiFetch<TimeSlot>(`/mentor/slots/${id}`, { method: "PUT", body });
}

export function deleteSlot(id: string): Promise<void> {
  return apiFetch<void>(`/mentor/slots/${id}`, { method: "DELETE" });
}

// ---------- 评价 ----------

export function listMentorReviews(
  mentorId: string,
  query: PageParams = {},
): Promise<ReviewList> {
  return apiFetch<ReviewList>(`/mentors/${mentorId}/reviews`, { query });
}

// ---------- 双创成果 ----------

export function listAchievements(
  mentorId: string,
  query: AchievementQuery = {},
): Promise<Page<Achievement>> {
  return apiFetch<Page<Achievement>>(
    `/mentors/${mentorId}/achievements`,
    { query },
  );
}

export function createAchievement(
  mentorId: string,
  body: CreateAchievementBody,
): Promise<Achievement> {
  return apiFetch<Achievement>(`/mentors/${mentorId}/achievements`, {
    method: "POST",
    body,
  });
}

export function updateAchievement(
  mentorId: string,
  achievementId: string,
  body: UpdateAchievementBody,
): Promise<Achievement> {
  return apiFetch<Achievement>(
    `/mentors/${mentorId}/achievements/${achievementId}`,
    { method: "PATCH", body },
  );
}

export function deleteAchievement(
  mentorId: string,
  achievementId: string,
): Promise<void> {
  return apiFetch<void>(
    `/mentors/${mentorId}/achievements/${achievementId}`,
    { method: "DELETE" },
  );
}

export function previewAchievementProof(
  mentorId: string,
  achievementId: string,
) {
  return apiBlob(
    `/mentors/${mentorId}/achievements/${achievementId}/proof/preview`,
  );
}

export function downloadAchievementProof(
  mentorId: string,
  achievementId: string,
) {
  return apiBlob(
    `/mentors/${mentorId}/achievements/${achievementId}/proof/download`,
  );
}

// ---------- 指导记录台账 ----------

export function listMentorRecords(
  query: MentorRecordQuery = {},
): Promise<Page<MentorRecord>> {
  return apiFetch<Page<MentorRecord>>("/mentor/records", { query });
}

export function exportMentorRecords(query: MentorRecordQuery = {}) {
  return apiBlob("/mentor/records/export", { query });
}
