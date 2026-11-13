import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { App, Button, Input, Select } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import type {
  MentorProfileDraft,
  UpdateMentorProfileBody,
} from "../../lib/api/types";

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

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

interface MentorProfileFormProps {
  initial?: Partial<MentorProfileDraft> | null;
  mentorType?: "internal" | "external" | null;
  submitLabel: string;
  onSubmit: (body: UpdateMentorProfileBody) => Promise<void>;
  extraActions?: ReactNode;
}

/** 导师档案表单：建档、修改草稿、信息修改申请共用。 */
export function MentorProfileForm({
  initial,
  mentorType,
  submitLabel,
  onSubmit,
  extraActions,
}: MentorProfileFormProps) {
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      researchFields: initial?.researchFields ?? [],
      summary: initial?.summary ?? "",
      achievements: initial?.achievements ?? "",
      guidanceExperience: initial?.guidanceExperience ?? "",
      affiliateOrg: initial?.affiliateOrg ?? "",
      socialRoles: initial?.socialRoles ?? "",
      professionalTitle: initial?.professionalTitle ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      researchFields: initial?.researchFields ?? [],
      summary: initial?.summary ?? "",
      achievements: initial?.achievements ?? "",
      guidanceExperience: initial?.guidanceExperience ?? "",
      affiliateOrg: initial?.affiliateOrg ?? "",
      socialRoles: initial?.socialRoles ?? "",
      professionalTitle: initial?.professionalTitle ?? "",
    });
  }, [initial, form]);

  const isInternal = mentorType === "internal";

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
      if (!isInternal) {
        body.affiliateOrg = nullable(values.affiliateOrg);
        body.socialRoles = nullable(values.socialRoles);
      }
      await onSubmit(body);
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
    <form onSubmit={form.handleSubmit(submit)}>
      {!mentorType ? (
        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-ink-muted">
          导师类型由学校人事数据确定。校内导师保存后，合作单位与社会任职将被清空。
        </p>
      ) : null}

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
            placeholder="输入后回车添加，例如：人工智能"
            style={{ width: "100%" }}
          />
        )}
      </FormField>

      <FormField
        control={form.control}
        name="professionalTitle"
        label="职称 / 资质"
        extra="校内、校外导师均需填写"
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

      {!isInternal ? (
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="affiliateOrg"
            label="合作单位"
            extra={mentorType ? "仅校外导师填写" : "校外导师填写"}
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
          <FormField
            control={form.control}
            name="socialRoles"
            label="社会任职"
            extra={mentorType ? "仅校外导师填写" : "校外导师填写"}
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
        </div>
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
            rows={4}
            maxLength={2000}
            placeholder="介绍你的研究方向、教学与科研经历"
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
            rows={4}
            maxLength={2000}
            placeholder="主持项目、论文、专利、获奖等"
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
            rows={4}
            maxLength={2000}
            placeholder="指导学生、竞赛、创业项目等经历"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="primary" htmlType="submit" loading={submitting}>
          {submitLabel}
        </Button>
        {extraActions}
      </div>
    </form>
  );
}
