import { useEffect, useState } from "react";
import { App, Modal, Select } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { currentPeriod, periodOptions } from "../../lib/format";
import { useCreateAssessment, useMentorOptions } from "./queries";

const schema = z.object({
  mentorId: z.string().min(1, "请选择导师"),
  period: z
    .string()
    .regex(/^\d{4}-[12]$/, "学期格式应为 YYYY-1 或 YYYY-2"),
});

type FormValues = z.infer<typeof schema>;

interface CreateAssessmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAssessmentModal({
  open,
  onClose,
  onSuccess,
}: CreateAssessmentModalProps) {
  const { message } = App.useApp();
  const mutation = useCreateAssessment();
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const mentors = useMentorOptions(debounced || undefined);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mentorId: "", period: currentPeriod() },
  });

  useEffect(() => {
    if (open) {
      form.reset({ mentorId: "", period: currentPeriod() });
      setKeyword("");
      setDebounced("");
    }
  }, [open, form]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync(values);
      message.success("考核周期已创建");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "创建失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="新建考核周期"
      onCancel={onClose}
      okText="创建考核"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
    >
      <p className="mb-4 text-sm text-ink-muted">
        选择导师与学期。创建后指标实时试算，提交初评时整组冻结。
      </p>
      <FormField
        control={form.control}
        name="mentorId"
        label="导师"
        required
        extra="仅可选择已生效导师；输入姓名可搜索"
      >
        {(field) => (
          <Select
            showSearch
            filterOption={false}
            value={field.value || undefined}
            onChange={field.onChange}
            onSearch={setKeyword}
            loading={mentors.isFetching}
            placeholder="搜索并选择导师"
            style={{ width: "100%" }}
            options={(mentors.data?.list ?? []).map((mentor) => ({
              value: mentor.id,
              label: `${mentor.name}（${mentor.deptName}）`,
            }))}
            notFoundContent={
              <div className="px-3 py-2 text-xs text-ink-muted">
                {mentors.isFetching ? "搜索中…" : "没有匹配的导师"}
              </div>
            }
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="period"
        label="考核学期"
        required
      >
        {(field) => (
          <Select
            value={field.value}
            onChange={field.onChange}
            options={periodOptions(8)}
            style={{ width: "100%" }}
          />
        )}
      </FormField>
    </Modal>
  );
}
