import { apiBlob, apiFetch } from "../client";
import type {
  AppointmentStats,
  AssessmentStats,
  GuidanceStats,
  MentorStats,
  StatsKind,
  StatsQuery,
} from "../types";

export function statsMentors(query: StatsQuery = {}): Promise<MentorStats> {
  return apiFetch<MentorStats>("/stats/mentors", { query });
}

export function statsAppointments(
  query: StatsQuery = {},
): Promise<AppointmentStats> {
  return apiFetch<AppointmentStats>("/stats/appointments", { query });
}

export function statsGuidance(
  query: StatsQuery = {},
): Promise<GuidanceStats> {
  return apiFetch<GuidanceStats>("/stats/guidance", { query });
}

export function statsAssessments(
  query: StatsQuery = {},
): Promise<AssessmentStats> {
  return apiFetch<AssessmentStats>("/stats/assessments", { query });
}

/** 导出 CSV：返回字节流，文件名由 Content-Disposition 给出。 */
export function exportStats(kind: StatsKind, query: StatsQuery = {}) {
  return apiBlob(`/stats/${kind}/export`, { query });
}
