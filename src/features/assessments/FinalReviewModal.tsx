import { useEffect, useState } from "react";
import { App, Input, Modal, Radio, Select } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import type { FinalReviewBody } from "../../lib/api/types";
import { useFinalReview } from "./queries";

const schema = z
  .object({
    decision: z.enum(["approve", "return"]),
    grade: z.number().int().min(1).max(3).optional(),
    comment: z
      .string()
      .trim()
      .min(1, "请填写终评意见")
      .max(1000, "终评意见不能超过 1000 个字符"),
  })
  .superRefine((values, ctx) => {
    if (values.decision === "approve" && !values.grade) {
      ctx.addIssue({
        code: "custom",
        path: ["grade"],
        message: "通过时必须选择终评等级",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface FinalReviewModalProps {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FinalReviewModal({
  open,
  assessmentId,
  onClose,
  onSuccess,
}: FinalReviewModalProps) {
  const { message } = App.useApp();
  const mutation = useFinalReview(assessmentId);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { decision: "approve", grade: 1, comment: "" },
  });

  useEffect(() => {
    if (open) form.reset({ decision: "approve", grade: 1, comment: "" });
  }, [open, form]);

  const decision = form.watch("decision");

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      const body: FinalReviewBody = {
        decision: values.decision,
        comment: values.comment,
      };
      if (values.decision === "approve" && values.grade) {
        body.grade = Number(values.grade);
      }
      await mutation.mutateAsync(body);
      message.success(
        values.decision === "approve" ? "考核终评已通过" : "考核已退回学院重评",
      );
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
      title="考核终评"
      onCancel={onClose}
      okText="提交终评"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
    >
      <p className="mb-4 text-sm text-ink-muted">
        通过需给出终评等级；退回学院重评时不能带等级。
      </p>
      <FormField
        control={form.control}
        name="decision"
        label="终评决定"
        required
      >
        {(field) => (
          <Radio.Group
            {...field}
            options={[
              { label: "通过", value: "approve" },
              { label: "退回重评", value: "return" },
            ]}
          />
        )}
      </FormField>
      {decision === "approve" ? (
        <FormField
          control={form.control}
          name="grade"
          label="终评等级"
          required
        >
          {(field) => (
            <Select
              value={field.value ? Number(field.value) : undefined}
              onChange={(value) => field.onChange(value)}
              style={{ width: "100%" }}
              options={[
                { label: "优秀", value: 1 },
                { label: "合格", value: 2 },
                { label: "不合格", value: 3 },
              ]}
            />
          )}
        </FormField>
      ) : null}
      <FormField
        control={form.control}
        name="comment"
        label="终评意见"
        required
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={4}
            maxLength={1000}
            showCount
            placeholder="请说明终评结论；退回时请写明需学院补充的内容"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
