import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listApplications } from "../../lib/api/endpoints/applications";
import { listMessages } from "../../lib/api/endpoints/messages";
import { getWorkProgress, sendReminder } from "../../lib/api/endpoints/system";
import { getWorkbench } from "../../lib/api/endpoints/mentors";
import { statsAssessments } from "../../lib/api/endpoints/stats";
import { currentPeriod } from "../../lib/format";
import type { ReminderBody } from "../../lib/api/types";
import { MESSAGE_POLL_INTERVAL } from "../messages/queries";

export function useWorkProgress(enabled: boolean) {
  return useQuery({
    queryKey: ["work-progress"],
    queryFn: getWorkProgress,
    enabled,
  });
}

export function usePendingApplications(status: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["applications", "pending", status],
    queryFn: () =>
      listApplications({ page: 1, pageSize: 5, status: status ?? undefined }),
    enabled: enabled && status !== null,
  });
}

export function useRecentMessages(enabled: boolean) {
  return useQuery({
    queryKey: ["messages", "recent"],
    queryFn: () => listMessages({ page: 1, pageSize: 5 }),
    enabled,
    refetchInterval: MESSAGE_POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

export function useCurrentAssessmentStats(enabled: boolean) {
  return useQuery({
    queryKey: ["stats", "assessments", currentPeriod()],
    queryFn: () => statsAssessments({ period: currentPeriod() }),
    enabled,
  });
}

export function useMentorWorkbench(mentorId: string | null) {
  return useQuery({
    queryKey: ["mentor-workbench", mentorId],
    queryFn: () => getWorkbench(mentorId as string),
    enabled: Boolean(mentorId),
  });
}

export function useSendReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReminderBody) => sendReminder(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}
