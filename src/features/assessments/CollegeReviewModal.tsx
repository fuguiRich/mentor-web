import { useEffect, useState } from "react";
import { App, Input, Modal, Radio } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { useAssessmentCollegeReview } from "./queries";

const schema = z.object({
  grade: z.number().int().min(1).max(3),
  comment: z
    .string()
    .trim()
    .min(1, "请填写初评意见")
    .max(1000, "初评意见不能超过 1000 个字符"),
});

type FormValues = z.infer<typeof schema>;

interface CollegeReviewModalProps {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CollegeReviewModal({
  open,
  assessmentId,
  onClose,
  onSuccess,
}: CollegeReviewModalProps) {
  const { message } = App.useApp();
  const mutation = useAssessmentCollegeReview(assessmentId);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { grade: 2, comment: "" },
  });

  useEffect(() => {
    if (open) form.reset({ grade: 2, comment: "" });
  }, [open, form]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        grade: Number(values.grade),
        comment: values.comment,
      });
      message.success("初评已提交");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        if (error instanceof ApiError) {
          message.error(error.message);
          if (error.httpStatus === 409) {
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
      title="提交初评"
      onCancel={onClose}
      okText="提交初评"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
    >
      <p className="mb-4 text-sm text-ink-muted">
        初评等级由学院人工判断；提交后本考核的指标与权重将整组冻结。
      </p>
      <FormField control={form.control} name="grade" label="初评等级" required>
        {(field) => (
          <Radio.Group
            value={Number(field.value)}
            onChange={(event) => field.onChange(Number(event.target.value))}
            options={[
              { label: "优秀", value: 1 },
              { label: "合格", value: 2 },
              { label: "不合格", value: 3 },
            ]}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="comment"
        label="初评意见"
        required
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={4}
            maxLength={1000}
            showCount
            placeholder="请结合学生评价、指导工作量与本院成果说明初评依据"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
