import { apiBlob, apiFetch } from "../client";
import type {
  ArchiveItem,
  ArchiveQuery,
  CreateArchiveBody,
  Page,
  UpdateArchiveBody,
} from "../types";

export function listArchives(
  query: ArchiveQuery = {},
): Promise<Page<ArchiveItem>> {
  return apiFetch<Page<ArchiveItem>>("/archives", { query });
}

export function getArchive(id: string): Promise<ArchiveItem> {
  return apiFetch<ArchiveItem>(`/archives/${id}`);
}

export function createArchive(body: CreateArchiveBody): Promise<ArchiveItem> {
  return apiFetch<ArchiveItem>("/archives", { method: "POST", body });
}

export function updateArchive(
  id: string,
  body: UpdateArchiveBody,
): Promise<ArchiveItem> {
  return apiFetch<ArchiveItem>(`/archives/${id}`, { method: "PATCH", body });
}

export function updateArchiveCore(
  id: string,
  core: 0 | 1,
): Promise<ArchiveItem> {
  return apiFetch<ArchiveItem>(`/archives/${id}/core`, {
    method: "PATCH",
    body: { core },
  });
}

export function deleteArchive(id: string): Promise<void> {
  return apiFetch<void>(`/archives/${id}`, { method: "DELETE" });
}

export function purgeArchives(): Promise<{ purged: number }> {
  return apiFetch<{ purged: number }>("/archives/purge", { method: "POST" });
}

export function previewArchiveFile(id: string, fileId: string) {
  return apiBlob(`/archives/${id}/files/${fileId}/preview`);
}

export function downloadArchiveFile(id: string, fileId: string) {
  return apiBlob(`/archives/${id}/files/${fileId}/download`);
}
