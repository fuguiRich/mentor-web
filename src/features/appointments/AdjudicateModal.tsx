import { useEffect, useState } from "react";
import { App, Input, Modal, Radio } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { useAdjudicate } from "./queries";

const schema = z.object({
  decision: z.enum(["uphold", "return"], { message: "请选择复核结论" }),
  comment: z
    .string()
    .trim()
    .min(1, "请填写复核意见")
    .max(500, "复核意见不能超过 500 个字符"),
});

type FormValues = z.infer<typeof schema>;

interface AdjudicateModalProps {
  open: boolean;
  appointmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjudicateModal({
  open,
  appointmentId,
  onClose,
  onSuccess,
}: AdjudicateModalProps) {
  const { message } = App.useApp();
  const mutation = useAdjudicate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { decision: "uphold", comment: "" },
  });

  useEffect(() => {
    if (open) form.reset({ decision: "uphold", comment: "" });
  }, [open, form]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: appointmentId,
        decision: values.decision,
        comment: values.comment,
      });
      message.success(
        values.decision === "return"
          ? "已退回导师重新填写指导记录"
          : "异议复核已提交，预约已完成",
      );
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        if (error instanceof ApiError) {
          message.error(error.message);
          if ([31105, 32003].includes(error.code)) {
            onSuccess();
            onClose();
          }
        } else {
          message.error("提交失败，请稍后重试");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="指导记录异议复核"
      onCancel={onClose}
      okText="提交复核"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
    >
      <p className="mb-4 text-sm text-ink-muted">
        复核意见会同时展示给学生与导师，请说明对异议的处理结论。
        维持原记录后预约直接完成；退回则恢复为「记录已提交」，导师需重新填写。
      </p>
      <FormField
        control={form.control}
        name="decision"
        label="复核结论"
        required
      >
        {(field) => (
          <Radio.Group
            {...field}
            options={[
              { label: "维持原记录（异议不成立）", value: "uphold" },
              { label: "退回导师重填（异议成立）", value: "return" },
            ]}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="comment"
        label="复核意见"
        required
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={4}
            maxLength={500}
            showCount
            placeholder="例如：经核对指导记录与过程材料，记录内容属实，维持原记录。"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
