import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  attachMyMaterial,
  createAchievement,
  createSlot,
  deleteAchievement,
  deleteSlot,
  getMyApplication,
  getMyProfile,
  listAchievements,
  listMentorRecords,
  listMentorReviews,
  listMyApplications,
  listMyMaterials,
  listSlots,
  removeMyMaterial,
  submitOnboarding,
  submitProfileChange,
  updateAchievement,
  updateMyContact,
  updateMyProfile,
  updateSlot,
  withdrawMyApplication,
} from "../../lib/api/endpoints/mentor";
import {
  attachRecordMaterial,
  confirmAppointment,
  getAppointmentReview,
  rejectAppointment,
  removeRecordMaterial,
  rescheduleAppointment,
  submitGuidanceRecord,
} from "../../lib/api/endpoints/appointments";
import { createAppeal } from "../../lib/api/endpoints/assessments";
import { ApiError } from "../../lib/api/client";
import type {
  AchievementQuery,
  AttachRecordMaterialBody,
  ConfirmAppointmentBody,
  CreateAchievementBody,
  CreateAppealBody,
  CreateSlotBody,
  MentorProfile,
  MentorRecordQuery,
  PageParams,
  RejectAppointmentBody,
  RescheduleAppointmentBody,
  SubmitRecordBody,
  UpdateAchievementBody,
  UpdateMentorProfileBody,
  UpdateSlotBody,
} from "../../lib/api/types";

// ---------- 我的档案 ----------

/**
 * 导师档案。无档案时后端返回 404 / 31102，这里转成 null，
 * 页面据此进入「建档」而不是错误页。
 */
export function useMyMentorProfile() {
  return useQuery({
    queryKey: ["mentor", "profile"],
    queryFn: async (): Promise<MentorProfile | null> => {
      try {
        return await getMyProfile();
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.httpStatus === 404 || error.code === 31102)
        ) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMentorProfileBody) => updateMyProfile(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor", "profile"] });
      void queryClient.invalidateQueries({ queryKey: ["mentor", "applications"] });
    },
  });
}

export function useUpdateMyContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactMobile: string | null) => updateMyContact(contactMobile),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor", "profile"] });
    },
  });
}

// ---------- 我的申请 ----------

export function useMyApplications(
  params: PageParams & { status?: number; type?: number },
) {
  return useQuery({
    queryKey: ["mentor", "applications", params],
    queryFn: () => listMyApplications(params),
  });
}

export function useMyApplication(id: string) {
  return useQuery({
    queryKey: ["mentor", "applications", "detail", id],
    queryFn: () => getMyApplication(id),
    enabled: Boolean(id),
  });
}

export function useSubmitOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitOnboarding,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor"] });
    },
  });
}

export function useSubmitProfileChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMentorProfileBody) => submitProfileChange(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor"] });
    },
  });
}

export function useWithdrawMyApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => withdrawMyApplication(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor"] });
    },
  });
}

// ---------- 申请材料 ----------

export function useMyMaterials(applicationId: string) {
  return useQuery({
    queryKey: ["mentor", "applications", applicationId, "materials"],
    queryFn: () => listMyMaterials(applicationId),
    enabled: Boolean(applicationId),
  });
}

export function useAttachMyMaterial(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { fileId: string; kind: number }) =>
      attachMyMaterial(applicationId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["mentor", "applications", applicationId, "materials"],
      });
    },
  });
}

export function useRemoveMyMaterial(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) =>
      removeMyMaterial(applicationId, materialId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["mentor", "applications", applicationId, "materials"],
      });
    },
  });
}

// ---------- 可指导时段 ----------

export function useSlots(enabled = true) {
  return useQuery({
    queryKey: ["mentor", "slots"],
    queryFn: listSlots,
    enabled,
  });
}

export function useCreateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSlotBody) => createSlot(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor", "slots"] });
    },
  });
}

export function useUpdateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSlotBody }) =>
      updateSlot(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor", "slots"] });
    },
  });
}

export function useDeleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSlot(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor", "slots"] });
    },
  });
}

// ---------- 预约处理 ----------

function useAppointmentMutation<TBody>(
  mutationFn: (args: { id: string; body: TBody }) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["mentor-workbench"] });
      void queryClient.invalidateQueries({ queryKey: ["mentor"] });
    },
  });
}

export function useConfirmAppointment() {
  return useAppointmentMutation<ConfirmAppointmentBody>(({ id, body }) =>
    confirmAppointment(id, body),
  );
}

export function useRejectAppointment() {
  return useAppointmentMutation<RejectAppointmentBody>(({ id, body }) =>
    rejectAppointment(id, body),
  );
}

export function useRescheduleAppointment() {
  return useAppointmentMutation<RescheduleAppointmentBody>(({ id, body }) =>
    rescheduleAppointment(id, body),
  );
}

export function useSubmitGuidanceRecord() {
  return useAppointmentMutation<SubmitRecordBody>(({ id, body }) =>
    submitGuidanceRecord(id, body),
  );
}

export function useAttachRecordMaterial(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AttachRecordMaterialBody) =>
      attachRecordMaterial(appointmentId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["appointments", appointmentId, "materials"],
      });
    },
  });
}

export function useRemoveRecordMaterial(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) =>
      removeRecordMaterial(appointmentId, materialId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["appointments", appointmentId, "materials"],
      });
    },
  });
}

export function useAppointmentReview(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["appointments", id, "review"],
    queryFn: async () => {
      try {
        return await getAppointmentReview(id);
      } catch (error) {
        if (error instanceof ApiError && error.httpStatus === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled,
    retry: false,
  });
}

// ---------- 评价 ----------

export function useMentorReviews(mentorId: string | null, params: PageParams) {
  return useQuery({
    queryKey: ["mentor", "reviews", mentorId, params],
    queryFn: () => listMentorReviews(mentorId as string, params),
    enabled: Boolean(mentorId),
  });
}

// ---------- 指导记录台账 ----------

export function useMentorRecords(params: MentorRecordQuery) {
  return useQuery({
    queryKey: ["mentor", "records", params],
    queryFn: () => listMentorRecords(params),
  });
}

// ---------- 双创成果 ----------

export function useAchievements(mentorId: string | null, params: AchievementQuery) {
  return useQuery({
    queryKey: ["mentor", "achievements", mentorId, params],
    queryFn: () => listAchievements(mentorId as string, params),
    enabled: Boolean(mentorId),
  });
}

export function useCreateAchievement(mentorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAchievementBody) =>
      createAchievement(mentorId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["mentor", "achievements"],
      });
    },
  });
}

export function useUpdateAchievement(mentorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      achievementId,
      body,
    }: {
      achievementId: string;
      body: UpdateAchievementBody;
    }) => updateAchievement(mentorId, achievementId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["mentor", "achievements"],
      });
    },
  });
}

export function useDeleteAchievement(mentorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (achievementId: string) =>
      deleteAchievement(mentorId, achievementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["mentor", "achievements"],
      });
    },
  });
}

// ---------- 考核申诉 ----------

export function useCreateAppeal(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAppealBody) => createAppeal(assessmentId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["assessments", assessmentId, "appeals"],
      });
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}
