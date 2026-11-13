import { useEffect, useState } from "react";
import { App, Input, Modal } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EvidenceUpload } from "../../components/EvidenceUpload";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import type { FileRef } from "../../lib/api/types";
import { useCreateAppeal } from "./queries";

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "请填写申诉说明")
    .max(1000, "申诉说明不能超过 1000 个字符"),
});

type FormValues = z.infer<typeof schema>;

export function MentorAppealModal({
  open,
  assessmentId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const mutation = useCreateAppeal(assessmentId);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<FileRef[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ reason: "" });
      setFiles([]);
    }
  }, [open, form]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        reason: values.reason.trim(),
        fileIds: files.map((file) => file.id),
      });
      message.success("申诉已提交");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "提交失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="提交考核申诉"
      onCancel={onClose}
      okText="提交申诉"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        只有已生效的考核可以申诉。申诉不会自动改变考核结果，创新创业学院会复核后处理。
      </p>
      <FormField
        control={form.control}
        name="reason"
        label="申诉说明"
        required
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={5}
            maxLength={1000}
            showCount
            placeholder="请说明对考核结果有异议的具体依据"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <div className="mt-4">
        <EvidenceUpload
          value={files}
          onChange={setFiles}
          title="申诉佐证"
          hint="可上传获奖证书、指导记录、项目材料等；最多 10 个文件。"
        />
      </div>
    </Modal>
  );
}
