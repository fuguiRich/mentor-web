import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createArchive,
  deleteArchive,
  getArchive,
  listArchives,
  purgeArchives,
  updateArchive,
  updateArchiveCore,
} from "../../lib/api/endpoints/archives";
import type {
  ArchiveQuery,
  CreateArchiveBody,
  UpdateArchiveBody,
} from "../../lib/api/types";

export function useArchives(params: ArchiveQuery) {
  return useQuery({
    queryKey: ["archives", "list", params],
    queryFn: () => listArchives(params),
  });
}

export function useArchive(id: string | null) {
  return useQuery({
    queryKey: ["archives", "detail", id],
    queryFn: () => getArchive(id as string),
    enabled: Boolean(id),
    refetchOnMount: "always",
  });
}

export function useCreateArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateArchiveBody) => createArchive(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
  });
}

export function useUpdateArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateArchiveBody }) =>
      updateArchive(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
  });
}

export function useDeleteArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteArchive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
  });
}

export function useUpdateArchiveCore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, core }: { id: string; core: 0 | 1 }) =>
      updateArchiveCore(id, core),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
  });
}

export function usePurgeArchives() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purgeArchives,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archives"] });
    },
  });
}
