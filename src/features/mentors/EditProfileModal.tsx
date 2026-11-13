import { useEffect, useState } from "react";
import { App, Input, Modal, Select } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import type {
  MentorSearchDetail,
  UpdateMentorProfileBody,
} from "../../lib/api/types";
import { useUpdateMentorProfile } from "./queries";

const schema = z.object({
  researchFields: z
    .array(z.string().trim().min(1).max(30, "每项不超过 30 个字符"))
    .max(5, "最多 5 项"),
  summary: z.string().max(2000, "个人简介不能超过 2000 个字符"),
  achievements: z.string().max(2000, "研究成果不能超过 2000 个字符"),
  guidanceExperience: z.string().max(2000, "指导经历不能超过 2000 个字符"),
  affiliateOrg: z.string().max(100, "合作单位不能超过 100 个字符"),
  socialRoles: z.string().max(100, "社会任职不能超过 100 个字符"),
  professionalTitle: z.string().max(100, "职称 / 资质不能超过 100 个字符"),
});

type FormValues = z.infer<typeof schema>;

interface EditProfileModalProps {
  open: boolean;
  mentor: MentorSearchDetail;
  onClose: () => void;
  onSuccess: () => void;
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function EditProfileModal({
  open,
  mentor,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const { message } = App.useApp();
  const mutation = useUpdateMentorProfile(mentor.id);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      researchFields: mentor.researchFields,
      summary: mentor.summary ?? "",
      achievements: mentor.researchAchievements ?? "",
      guidanceExperience: mentor.guidanceExperience ?? "",
      affiliateOrg: mentor.affiliateOrg ?? "",
      socialRoles: mentor.socialRoles ?? "",
      professionalTitle: mentor.professionalTitle ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      researchFields: mentor.researchFields,
      summary: mentor.summary ?? "",
      achievements: mentor.researchAchievements ?? "",
      guidanceExperience: mentor.guidanceExperience ?? "",
      affiliateOrg: mentor.affiliateOrg ?? "",
      socialRoles: mentor.socialRoles ?? "",
      professionalTitle: mentor.professionalTitle ?? "",
    });
  }, [open, mentor, form]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      const body: UpdateMentorProfileBody = {
        researchFields: values.researchFields,
        summary: nullable(values.summary),
        achievements: nullable(values.achievements),
        guidanceExperience: nullable(values.guidanceExperience),
        professionalTitle: nullable(values.professionalTitle),
      };
      if (mentor.mentorType === "external") {
        body.affiliateOrg = nullable(values.affiliateOrg);
        body.socialRoles = nullable(values.socialRoles);
      }
      await mutation.mutateAsync(body);
      message.success("导师档案已更新，修改已留痕");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "保存失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="修改导师档案"
      onCancel={onClose}
      okText="保存修改"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      width={720}
    >
      <p className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-ink-muted">
        仅修改导师可填报字段，不会改变档案状态；修改前后快照会写入操作日志。
      </p>

      <FormField
        control={form.control}
        name="researchFields"
        label="指导方向"
        extra="最多 5 项，每项不超过 30 个字符"
      >
        {(field) => (
          <Select
            mode="tags"
            value={field.value ?? []}
            onChange={field.onChange}
            tokenSeparators={[",", "，"]}
            placeholder="输入后回车添加"
            style={{ width: "100%" }}
          />
        )}
      </FormField>

      <FormField
        control={form.control}
        name="professionalTitle"
        label="职称 / 资质"
      >
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={100}
            placeholder="例如：教授 / 高级工程师"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>

      {mentor.mentorType === "external" ? (
        <>
          <FormField
            control={form.control}
            name="affiliateOrg"
            label="合作单位"
          >
            {(field) => (
              <Input
                {...field}
                value={field.value ?? ""}
                maxLength={100}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          </FormField>
          <FormField control={form.control} name="socialRoles" label="社会任职">
            {(field) => (
              <Input
                {...field}
                value={field.value ?? ""}
                maxLength={100}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          </FormField>
        </>
      ) : null}

      <FormField
        control={form.control}
        name="summary"
        label="个人简介"
        extra={`${form.watch("summary")?.length ?? 0} / 2000`}
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={2000}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>

      <FormField
        control={form.control}
        name="achievements"
        label="研究成果"
        extra={`${form.watch("achievements")?.length ?? 0} / 2000`}
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={2000}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>

      <FormField
        control={form.control}
        name="guidanceExperience"
        label="指导经历"
        extra={`${form.watch("guidanceExperience")?.length ?? 0} / 2000`}
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={2000}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
