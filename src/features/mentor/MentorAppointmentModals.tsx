import { useEffect, useState } from "react";
import { App, Input, InputNumber, Modal, Radio } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { toLocalDateTimeInput } from "../../lib/format";
import type { GuidanceRecord } from "../../lib/api/types";
import {
  useConfirmAppointment,
  useRejectAppointment,
  useRescheduleAppointment,
  useSubmitGuidanceRecord,
} from "./queries";

function conflict(error: unknown): boolean {
  return error instanceof ApiError && [31105, 32003].includes(error.code);
}

// ---------- 确认 ----------

const confirmSchema = z.object({
  comment: z.string().max(500, "处理意见不能超过 500 个字符").optional(),
});

type ConfirmValues = z.infer<typeof confirmSchema>;

export function ConfirmAppointmentModal({
  open,
  appointmentId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  appointmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const mutation = useConfirmAppointment();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ConfirmValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { comment: "" },
  });

  useEffect(() => {
    if (open) form.reset({ comment: "" });
  }, [open, form]);

  async function submit(values: ConfirmValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: appointmentId,
        body: { comment: values.comment?.trim() || undefined },
      });
      message.success("预约已确认");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "操作失败，请稍后重试",
        );
        if (conflict(error)) {
          onSuccess();
          onClose();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="确认预约"
      onCancel={onClose}
      okText="确认预约"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        确认后学生将收到通知，请按约定时间开展指导。
      </p>
      <FormField control={form.control} name="comment" label="处理意见">
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={500}
            showCount
            placeholder="可选，例如：时间没问题，请准时参加"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}

// ---------- 拒绝 ----------

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "请填写拒绝原因")
    .max(500, "拒绝原因不能超过 500 个字符"),
});

type RejectValues = z.infer<typeof rejectSchema>;

export function RejectAppointmentModal({
  open,
  appointmentId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  appointmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const mutation = useRejectAppointment();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (open) form.reset({ reason: "" });
  }, [open, form]);

  async function submit(values: RejectValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: appointmentId,
        body: { reason: values.reason.trim() },
      });
      message.success("预约已拒绝");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "操作失败，请稍后重试",
        );
        if (conflict(error)) {
          onSuccess();
          onClose();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="拒绝预约"
      onCancel={onClose}
      okText="确认拒绝"
      okButtonProps={{ danger: true }}
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        拒绝原因会展示给学生，学生可据此重新发起预约。
      </p>
      <FormField
        control={form.control}
        name="reason"
        label="拒绝原因"
        required
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={4}
            maxLength={500}
            showCount
            placeholder="例如：该时段已排满，请另约时间"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}

// ---------- 改期 ----------

const rescheduleSchema = z.object({
  proposedTime: z
    .string()
    .min(1, "请选择建议时间")
    .refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
    }, "建议时间必须晚于当前时间"),
  comment: z.string().max(500, "处理意见不能超过 500 个字符").optional(),
});

type RescheduleValues = z.infer<typeof rescheduleSchema>;

export function RescheduleAppointmentModal({
  open,
  appointmentId,
  initialTime,
  onClose,
  onSuccess,
}: {
  open: boolean;
  appointmentId: string;
  initialTime: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const mutation = useRescheduleAppointment();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<RescheduleValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      proposedTime: toLocalDateTimeInput(initialTime),
      comment: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        proposedTime: toLocalDateTimeInput(initialTime),
        comment: "",
      });
    }
  }, [open, initialTime, form]);

  async function submit(values: RescheduleValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: appointmentId,
        body: {
          proposedTime: new Date(values.proposedTime).toISOString(),
          comment: values.comment?.trim() || undefined,
        },
      });
      message.success("已提交改期建议");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "操作失败，请稍后重试",
        );
        if (conflict(error)) {
          onSuccess();
          onClose();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="改期建议"
      onCancel={onClose}
      okText="提交改期"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        改期建议会展示给学生；学生需要重新确认时间。
      </p>
      <FormField
        control={form.control}
        name="proposedTime"
        label="建议时间"
        required
      >
        {(field) => (
          <Input
            type="datetime-local"
            value={field.value ?? ""}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField control={form.control} name="comment" label="处理意见">
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={500}
            showCount
            placeholder="可选，例如：原时间有冲突，改到周二上午"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}

// ---------- 指导记录 ----------

const recordSchema = z.object({
  actualTime: z
    .string()
    .min(1, "请选择实际指导时间")
    .refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
    }, "实际指导时间不能晚于当前时间"),
  mode: z.number().int().min(1).max(2),
  coreContent: z
    .string()
    .trim()
    .min(1, "请填写核心指导内容")
    .max(5000, "核心指导内容不能超过 5000 个字符"),
  followUp: z
    .string()
    .trim()
    .min(1, "请填写后续指导建议")
    .max(2000, "后续指导建议不能超过 2000 个字符"),
  durationMinutes: z.number().int().min(1).max(600).optional(),
});

type RecordValues = z.infer<typeof recordSchema>;

export function GuidanceRecordModal({
  open,
  appointmentId,
  initial,
  onClose,
  onSuccess,
}: {
  open: boolean;
  appointmentId: string;
  initial?: GuidanceRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const mutation = useSubmitGuidanceRecord();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<RecordValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      actualTime: toLocalDateTimeInput(new Date()),
      mode: 1,
      coreContent: "",
      followUp: "",
      durationMinutes: undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      initial
        ? {
            actualTime: toLocalDateTimeInput(initial.actualTime),
            mode: initial.mode,
            coreContent: initial.coreContent,
            followUp: initial.followUp ?? "",
            durationMinutes:
              initial.durationMinutes > 0
                ? initial.durationMinutes
                : undefined,
          }
        : {
            actualTime: toLocalDateTimeInput(new Date()),
            mode: 1,
            coreContent: "",
            followUp: "",
            durationMinutes: undefined,
          },
    );
  }, [open, initial, form]);

  async function submit(values: RecordValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: appointmentId,
        body: {
          actualTime: new Date(values.actualTime).toISOString(),
          mode: Number(values.mode),
          coreContent: values.coreContent.trim(),
          followUp: values.followUp.trim(),
          durationMinutes:
            values.durationMinutes === undefined
              ? undefined
              : Number(values.durationMinutes),
        },
      });
      message.success(initial ? "指导记录已更新" : "指导记录已提交");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "提交失败，请稍后重试",
        );
        if (conflict(error)) {
          onSuccess();
          onClose();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={initial ? "重填指导记录" : "填报指导记录"}
      onCancel={onClose}
      okText={initial ? "保存记录" : "提交记录"}
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      width={720}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        提交后学生将核对记录；学生提出异议时，学院会介入复核。
      </p>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="actualTime"
          label="实际指导时间"
          required
        >
          {(field) => (
            <Input
              type="datetime-local"
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="mode"
          label="指导方式"
          required
        >
          {(field) => (
            <Radio.Group
              value={Number(field.value)}
              onChange={(event) => field.onChange(Number(event.target.value))}
              options={[
                { label: "线上", value: 1 },
                { label: "线下", value: 2 },
              ]}
            />
          )}
        </FormField>
      </div>
      <FormField
        control={form.control}
        name="coreContent"
        label="核心指导内容"
        required
        extra={`${form.watch("coreContent")?.length ?? 0} / 5000`}
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={5}
            maxLength={5000}
            placeholder="本次指导围绕什么展开、给了哪些具体建议"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="followUp"
        label="后续指导建议"
        required
        extra={`${form.watch("followUp")?.length ?? 0} / 2000`}
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={2000}
            placeholder="下次需要准备什么、重点推进什么"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="durationMinutes"
        label="指导时长（分钟）"
        extra="可选，1–600；不填表示未记录"
      >
        {(field) => (
          <InputNumber
            min={1}
            max={600}
            precision={0}
            value={field.value ?? null}
            onChange={(value) =>
              field.onChange(value === null ? undefined : value)
            }
            style={{ width: 180 }}
          />
        )}
      </FormField>
    </Modal>
  );
}
