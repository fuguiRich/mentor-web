import { useEffect, useState } from "react";
import { App, Modal, Select } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import type { StudentAchievement } from "../../lib/api/types";
import {
  useLinkStudentAchievement,
  useMentorOptions,
} from "./queries";

const schema = z.object({
  mentorProfileId: z.string().min(1, "请选择导师"),
});

type FormValues = z.infer<typeof schema>;

interface LinkMentorModalProps {
  open: boolean;
  achievement: StudentAchievement | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function LinkMentorModal({
  open,
  achievement,
  onClose,
  onSuccess,
}: LinkMentorModalProps) {
  const { message } = App.useApp();
  const mutation = useLinkStudentAchievement();
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mentors = useMentorOptions(debounced || undefined);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mentorProfileId: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ mentorProfileId: "" });
      setKeyword("");
      setDebounced("");
    }
  }, [open, form]);

  async function submit(values: FormValues) {
    if (!achievement) return;
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: achievement.id,
        mentorProfileId: values.mentorProfileId,
      });
      message.success("已关联导师，并同步生成导师成果与归档");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "关联失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="关联导师"
      onCancel={onClose}
      okText="确认关联"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
    >
      {achievement ? (
        <div className="mb-4 rounded-md bg-muted px-3 py-2 text-sm">
          <div className="text-xs text-ink-muted">学生成果</div>
          <div className="mt-1 font-medium text-ink">{achievement.title}</div>
          <div className="mt-1 text-xs text-ink-muted">
            {achievement.studentName} · {achievement.awardedAt}
          </div>
        </div>
      ) : null}
      <FormField
        control={form.control}
        name="mentorProfileId"
        label="关联导师"
        required
        extra="只能关联已生效导师；重复关联会返回冲突提示。"
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
          />
        )}
      </FormField>
    </Modal>
  );
}
