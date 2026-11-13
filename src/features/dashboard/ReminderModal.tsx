import { useEffect, useState } from "react";
import { App, Modal, Select } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { REMINDER_TYPE_LABELS, toOptions } from "../../lib/enums";
import type { WorkProgressMentor } from "../../lib/api/types";
import { useSendReminder } from "./queries";

const schema = z.object({
  type: z.enum([
    "pending-appointments",
    "record-missing",
    "assessment-pending",
  ]),
  mentorProfileIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ReminderModalProps {
  open: boolean;
  mentors: WorkProgressMentor[];
  onClose: () => void;
}

export function ReminderModal({ open, mentors, onClose }: ReminderModalProps) {
  const { message } = App.useApp();
  const mutation = useSendReminder();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "pending-appointments", mentorProfileIds: [] },
  });

  useEffect(() => {
    if (open) {
      form.reset({ type: "pending-appointments", mentorProfileIds: [] });
    }
  }, [open, form]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      const result = await mutation.mutateAsync({
        type: values.type,
        mentorProfileIds: values.mentorProfileIds?.length
          ? values.mentorProfileIds
          : undefined,
      });
      message.success(
        `提醒已发送 ${result.sent} 条${result.skipped ? `，跳过 ${result.skipped} 条（无待办）` : ""}`,
      );
      onClose();
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "发送失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="发送站内提醒"
      onCancel={onClose}
      okText="发送提醒"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        提醒只发给存在对应待办事项的导师；未选导师时默认面向全部导师。
      </p>
      <FormField
        control={form.control}
        name="type"
        label="提醒类型"
        required
      >
        {(field) => (
          <Select
            value={field.value}
            onChange={field.onChange}
            options={toOptions(REMINDER_TYPE_LABELS, [
              "pending-appointments",
              "record-missing",
              "assessment-pending",
            ])}
            style={{ width: "100%" }}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="mentorProfileIds"
        label="指定导师"
        extra="可多选；留空表示全部导师。"
      >
        {(field) => (
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            value={field.value ?? []}
            onChange={field.onChange}
            options={mentors.map((mentor) => ({
              value: mentor.mentorProfileId,
              label: mentor.mentorName,
            }))}
            style={{ width: "100%" }}
          />
        )}
      </FormField>
    </Modal>
  );
}
