import { apiBlob, apiFetch } from "../client";
import type {
  Appointment,
  AppointmentDetail,
  AppointmentListItem,
  AppointmentMaterial,
  AppointmentQuery,
  AttachRecordMaterialBody,
  ConfirmAppointmentBody,
  GuidanceRecord,
  Page,
  RejectAppointmentBody,
  RescheduleAppointmentBody,
  Review,
  SubmitRecordBody,
} from "../types";

export function listAppointments(
  query: AppointmentQuery = {},
): Promise<Page<AppointmentListItem>> {
  return apiFetch<Page<AppointmentListItem>>("/appointments", { query });
}

export function getAppointment(id: string): Promise<AppointmentDetail> {
  return apiFetch<AppointmentDetail>(`/appointments/${id}`);
}

export function adjudicateAppointment(
  id: string,
  body: { decision: "uphold" | "return"; comment: string },
): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${id}/adjudicate`, {
    method: "POST",
    body,
  });
}

export function confirmAppointment(
  id: string,
  body: ConfirmAppointmentBody = {},
): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${id}/confirm`, {
    method: "POST",
    body,
  });
}

export function rejectAppointment(
  id: string,
  body: RejectAppointmentBody,
): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${id}/reject`, {
    method: "POST",
    body,
  });
}

export function rescheduleAppointment(
  id: string,
  body: RescheduleAppointmentBody,
): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${id}/reschedule`, {
    method: "POST",
    body,
  });
}

export function getGuidanceRecord(id: string): Promise<GuidanceRecord> {
  return apiFetch<GuidanceRecord>(`/appointments/${id}/record`);
}

export function submitGuidanceRecord(
  id: string,
  body: SubmitRecordBody,
): Promise<GuidanceRecord> {
  return apiFetch<GuidanceRecord>(`/appointments/${id}/record`, {
    method: "POST",
    body,
  });
}

export function listAppointmentMaterials(
  id: string,
): Promise<Page<AppointmentMaterial>> {
  return apiFetch<Page<AppointmentMaterial>>(`/appointments/${id}/materials`);
}

export function attachRecordMaterial(
  id: string,
  body: AttachRecordMaterialBody,
): Promise<AppointmentMaterial> {
  return apiFetch<AppointmentMaterial>(
    `/appointments/${id}/record/materials`,
    { method: "POST", body },
  );
}

export function removeRecordMaterial(
  id: string,
  materialId: string,
): Promise<void> {
  return apiFetch<void>(
    `/appointments/${id}/record/materials/${materialId}`,
    { method: "DELETE" },
  );
}

export function getAppointmentReview(id: string): Promise<Review> {
  return apiFetch<Review>(`/appointments/${id}/review`);
}

// ---------- 预约 / 过程材料预览与下载 ----------

export function previewAppointmentMaterial(
  id: string,
  materialId: string,
) {
  return apiBlob(
    `/appointments/${id}/materials/${materialId}/preview`,
  );
}

export function downloadAppointmentMaterial(
  id: string,
  materialId: string,
) {
  return apiBlob(
    `/appointments/${id}/materials/${materialId}/download`,
  );
}

export function previewRecordMaterial(id: string, materialId: string) {
  return apiBlob(
    `/appointments/${id}/record/materials/${materialId}/preview`,
  );
}

export function downloadRecordMaterial(id: string, materialId: string) {
  return apiBlob(
    `/appointments/${id}/record/materials/${materialId}/download`,
  );
}
