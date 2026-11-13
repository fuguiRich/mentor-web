import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjudicateAppointment,
  getAppointment,
  getGuidanceRecord,
  listAppointmentMaterials,
  listAppointments,
} from "../../lib/api/endpoints/appointments";
import type { AppointmentQuery } from "../../lib/api/types";

export function useAppointments(params: AppointmentQuery) {
  return useQuery({
    queryKey: ["appointments", "list", params],
    queryFn: () => listAppointments(params),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ["appointments", "detail", id],
    queryFn: () => getAppointment(id),
    enabled: Boolean(id),
  });
}

export function useGuidanceRecord(id: string) {
  return useQuery({
    queryKey: ["appointments", id, "record"],
    queryFn: () => getGuidanceRecord(id),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useAppointmentMaterials(id: string) {
  return useQuery({
    queryKey: ["appointments", id, "materials"],
    queryFn: () => listAppointmentMaterials(id),
    enabled: Boolean(id),
  });
}

export function useAdjudicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: "uphold" | "return";
      comment: string;
    }) => adjudicateAppointment(id, { decision, comment }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["work-progress"] });
    },
  });
}
