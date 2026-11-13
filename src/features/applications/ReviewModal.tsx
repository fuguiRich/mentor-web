import { useEffect, useState } from "react";
import { App, Input, Modal, Radio } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { useReviewApplication } from "./queries";
import type { ReviewKind } from "./queries";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  comment: z
    .string()
    .trim()
    .min(1, "请填写审核意见")
    .max(500, "审核意见不能超过 500 个字符"),
});

type FormValues = z.infer<typeof schema>;

interface ReviewModalProps {
  open: boolean;
  applicationId: string;
  kind: ReviewKind;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({
  open,
  applicationId,
  kind,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const { message } = App.useApp();
  const mutation = useReviewApplication();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { decision: "approve", comment: "" },
  });

  useEffect(() => {
    if (open) form.reset({ decision: "approve", comment: "" });
  }, [open, form]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: applicationId,
        kind,
        body: values,
      });
      message.success(
        kind === "college" ? "二级学院审核已提交" : "创新创业学院审核已提交",
      );
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        if (error instanceof ApiError) {
          message.error(error.message);
          if ([31103, 31105, 31106].includes(error.code)) {
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
      title={kind === "college" ? "二级学院审核" : "创新创业学院审核"}
      onCancel={onClose}
      okText="提交审核"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
    >
      <p className="mb-4 text-sm text-ink-muted">
        通过或不通过都需要填写审核意见（1–500 字），审核记录会随申请留痕。
      </p>
      <FormField
        control={form.control}
        name="decision"
        label="审核决定"
        required
      >
        {(field) => (
          <Radio.Group
            {...field}
            options={[
              { label: "通过", value: "approve" },
              { label: "不通过", value: "reject" },
            ]}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="comment"
        label="审核意见"
        required
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={4}
            maxLength={500}
            showCount
            placeholder="请说明审核依据或退回原因"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
