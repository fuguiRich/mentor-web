import { useEffect, useMemo, useState } from "react";
import { App, Button, Input, Modal, Select } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { EvidenceUpload } from "../../components/EvidenceUpload";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { useDepts } from "../../lib/hooks/useDepts";
import { useMentorOptions } from "../../lib/hooks/useMentorOptions";
import { flattenDepts } from "../../lib/tree";
import { listApplications } from "../../lib/api/endpoints/applications";
import { listAssessments } from "../../lib/api/endpoints/assessments";
import { listAchievements } from "../../lib/api/endpoints/mentor";
import { listStudentAchievements } from "../../lib/api/endpoints/studentAchievements";
import {
  ARCHIVE_CATEGORY_LABELS,
  ARCHIVE_TARGET_TYPE_LABELS,
  toOptions,
} from "../../lib/enums";
import type { ArchiveItem, FileRef } from "../../lib/api/types";
import { useMentorNameMap } from "../assessments/queries";
import {
  useCreateArchive,
  useUpdateArchive,
} from "./queries";

type ArchiveMode = "create" | "edit";

interface ArchiveFormModalProps {
  open: boolean;
  mode: ArchiveMode;
  archive?: ArchiveItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ArchiveFormModal({
  open,
  mode,
  archive,
  onClose,
  onSuccess,
}: ArchiveFormModalProps) {
  return (
    <Modal
      open={open}
      title={mode === "create" ? "新建归档" : "修改归档条目"}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      {mode === "create" ? (
        <CreateArchiveForm onClose={onClose} onSuccess={onSuccess} />
      ) : archive ? (
        <EditArchiveForm
          archive={archive}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </Modal>
  );
}

const createSchema = z.object({
  targetType: z.enum([
    "MentorApplication",
    "Assessment",
    "GuidanceRecord",
    "Achievement",
    "StudentAchievement",
    "Other",
  ]),
  targetId: z
    .string()
    .trim()
    .min(1, "请选择归档对象")
    .max(50, "归档对象标识不能超过 50 个字符"),
  title: z
    .string()
    .trim()
    .min(1, "请输入归档标题")
    .max(200, "标题不能超过 200 个字符"),
  category: z.enum(["guidance-record", "achievement", "other"]),
  mentorId: z.string().regex(/^\d*$/, "导师 ID 只能是数字").optional(),
  deptId: z.string().regex(/^\d*$/, "部门 ID 只能是数字").optional(),
  summary: z.string().max(500, "摘要不能超过 500 个字符").optional(),
});

type CreateValues = z.infer<typeof createSchema>;

function CreateArchiveForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const { user, can, isSuperAdmin } = useAuth();
  const schoolWide = isSuperAdmin || can("mentor-application:review-sc");
  const mutation = useCreateArchive();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<FileRef[]>([]);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      targetType: "Achievement",
      targetId: "",
      title: "",
      category: "achievement",
      mentorId: "",
      deptId: schoolWide ? "" : user?.deptId ?? "",
      summary: "",
    },
  });

  const mentors = useMentorOptions();
  const depts = useDepts();
  const mentorNames = useMentorNameMap();
  const targetType = form.watch("targetType");
  const mentorId = form.watch("mentorId");

  const applications = useQuery({
    queryKey: ["archives", "target-options", "applications"],
    queryFn: () => listApplications({ page: 1, pageSize: 100 }),
    enabled: targetType === "MentorApplication",
    staleTime: 60_000,
  });
  const assessments = useQuery({
    queryKey: ["archives", "target-options", "assessments"],
    queryFn: () => listAssessments({ page: 1, pageSize: 100 }),
    enabled: targetType === "Assessment",
    staleTime: 60_000,
  });
  const achievements = useQuery({
    queryKey: ["archives", "target-options", "achievements", mentorId],
    queryFn: () => listAchievements(mentorId as string),
    enabled: targetType === "Achievement" && Boolean(mentorId),
    staleTime: 60_000,
  });
  const studentAchievements = useQuery({
    queryKey: ["archives", "target-options", "student-achievements"],
    queryFn: () => listStudentAchievements({ page: 1, pageSize: 100 }),
    enabled: targetType === "StudentAchievement",
    staleTime: 60_000,
  });

  const targetOptions = useMemo(() => {
    if (targetType === "MentorApplication") {
      return (applications.data?.list ?? []).map((application) => ({
        value: application.id,
        label: `申请编号 #${application.id} · 申请人编号 #${application.applicantId}`,
      }));
    }
    if (targetType === "Assessment") {
      return (assessments.data?.list ?? []).map((assessment) => {
        const mentorName =
          mentorNames.map.get(assessment.mentorProfileId) ??
          `导师编号 #${assessment.mentorProfileId}`;
        return {
          value: assessment.id,
          label: `考核 #${assessment.id} · ${mentorName} · ${assessment.period}`,
        };
      });
    }
    if (targetType === "Achievement") {
      return (achievements.data?.list ?? []).map((achievement) => ({
        value: achievement.id,
        label: `${achievement.title}（${achievement.awardedAt}）`,
      }));
    }
    if (targetType === "StudentAchievement") {
      return (studentAchievements.data?.list ?? []).map((achievement) => ({
        value: achievement.id,
        label: `${achievement.studentName} · ${achievement.title}`,
      }));
    }
    if (targetType === "Other") {
      return [{ value: "manual", label: "手工归档（无具体对象）" }];
    }
    return [];
  }, [
    targetType,
    applications.data,
    assessments.data,
    achievements.data,
    studentAchievements.data,
    mentorNames.map,
  ]);

  const targetLoading =
    applications.isFetching ||
    assessments.isFetching ||
    achievements.isFetching ||
    studentAchievements.isFetching;

  useEffect(() => {
    form.reset({
      targetType: "Achievement",
      targetId: "",
      title: "",
      category: "achievement",
      mentorId: "",
      deptId: schoolWide ? "" : user?.deptId ?? "",
      summary: "",
    });
    setFiles([]);
  }, [form, schoolWide, user?.deptId]);

  async function submit(values: CreateValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        targetType: values.targetType,
        targetId: values.targetId.trim(),
        title: values.title.trim(),
        category: values.category,
        mentorId: values.mentorId?.trim() || undefined,
        deptId: values.deptId?.trim() || undefined,
        summary: values.summary?.trim() || undefined,
        fileIds: files.map((file) => file.id),
      });
      message.success("归档已创建");
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
    <form onSubmit={form.handleSubmit(submit)}>
      <p className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-ink-muted">
        手工归档一律为非核心材料；目标对象只做弱关联，不校验是否存在。
      </p>
      <FormField
        control={form.control}
        name="targetType"
        label="目标类型"
        required
      >
        {(field) => (
          <Select
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              form.setValue(
                "targetId",
                value === "Other" ? "manual" : "",
              );
            }}
            style={{ width: "100%" }}
            options={toOptions(ARCHIVE_TARGET_TYPE_LABELS, [
              "MentorApplication",
              "Assessment",
              "Achievement",
              "StudentAchievement",
              "Other",
            ])}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="targetId"
        label="归档对象"
        required
        extra={
          targetType === "Achievement" && !mentorId
            ? "请先在下方选择归属导师，再选择其成果"
            : targetType === "Other"
              ? "其他类型只做手工归档，不关联具体业务对象"
              : "从现有业务对象中选择，不需要手工填写 ID"
        }
      >
        {(field) => (
          <Select
            showSearch
            optionFilterProp="label"
            value={field.value || undefined}
            onChange={field.onChange}
            options={targetOptions}
            loading={targetLoading}
            placeholder={
              targetType === "Achievement" && !mentorId
                ? "请先选择归属导师"
                : "搜索并选择归档对象"
            }
            notFoundContent={
              targetLoading
                ? "加载中…"
                : targetType === "Achievement"
                  ? "该导师暂无可归档成果"
                  : "暂无可选对象"
            }
            style={{ width: "100%" }}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="title"
        label="归档标题"
        required
      >
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={200}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="category"
        label="归档分类"
        required
        extra="入驻申请与考核由系统自动归档，手工归档只允许以下三类。"
      >
        {(field) => (
          <Select
            value={field.value}
            onChange={field.onChange}
            style={{ width: "100%" }}
            options={toOptions(ARCHIVE_CATEGORY_LABELS, [
              "guidance-record",
              "achievement",
              "other",
            ])}
          />
        )}
      </FormField>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="mentorId"
          label="归属导师"
          extra="归档成果时必选"
        >
          {(field) => (
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              value={field.value || undefined}
              onChange={(value) => {
                field.onChange(value ?? "");
                if (targetType === "Achievement") {
                  form.setValue("targetId", "");
                }
              }}
              options={(mentors.data?.list ?? []).map((mentor) => ({
                value: mentor.id,
                label: `${mentor.name}（${mentor.deptName}）`,
              }))}
              loading={mentors.isFetching}
              placeholder="选择归属导师"
              style={{ width: "100%" }}
            />
          )}
        </FormField>
        {schoolWide ? (
          <FormField
            control={form.control}
            name="deptId"
            label="归属学院"
          >
            {(field) => (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                value={field.value || undefined}
                onChange={field.onChange}
                options={flattenDepts(depts.data ?? [])}
                loading={depts.isLoading}
                placeholder="选择归属学院"
                style={{ width: "100%" }}
              />
            )}
          </FormField>
        ) : null}
      </div>
      <FormField control={form.control} name="summary" label="摘要">
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={500}
            showCount
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <div className="mb-4">
        <EvidenceUpload
          value={files}
          onChange={setFiles}
          title="归档附件"
          hint="可上传获奖证书、批复文件、指导记录等佐证材料；创建后可在归档详情中预览、下载。"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" htmlType="submit" loading={submitting}>
          创建归档
        </Button>
      </div>
    </form>
  );
}

const editSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "请输入归档标题")
    .max(200, "标题不能超过 200 个字符"),
  summary: z.string().max(500, "摘要不能超过 500 个字符").optional(),
  retentionUntil: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

function EditArchiveForm({
  archive,
  onClose,
  onSuccess,
}: {
  archive: ArchiveItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const mutation = useUpdateArchive();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<FileRef[]>(archive.files ?? []);
  const [filesTouched, setFilesTouched] = useState(false);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: archive.title,
      summary: archive.summary ?? "",
      retentionUntil: archive.retentionUntil ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      title: archive.title,
      summary: archive.summary ?? "",
      retentionUntil: archive.retentionUntil ?? "",
    });
    setFiles(archive.files ?? []);
    setFilesTouched(false);
  }, [archive, form]);

  async function submit(values: EditValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: archive.id,
        body: {
          title: values.title.trim(),
          summary: values.summary?.trim() || undefined,
          retentionUntil: values.retentionUntil || null,
          ...(filesTouched
            ? { fileIds: files.map((file) => file.id) }
            : {}),
        },
      });
      message.success("归档条目已更新");
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
    <form onSubmit={form.handleSubmit(submit)}>
      <FormField control={form.control} name="title" label="归档标题" required>
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={200}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField control={form.control} name="summary" label="摘要">
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={500}
            showCount
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="retentionUntil"
        label="保留截止日"
        extra={
          archive.core === 1
            ? "核心材料永久保存，不能设置保留期。"
            : "留空表示不自动清理；格式 YYYY-MM-DD。"
        }
      >
        {(field) => (
          <Input
            type="date"
            {...field}
            value={field.value ?? ""}
            disabled={archive.core === 1}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <div className="mb-4">
        <EvidenceUpload
          value={files}
          onChange={(next) => {
            setFiles(next);
            setFilesTouched(true);
          }}
          title="归档附件"
          hint="可补充或移除归档附件；留空并保存会清空本条归档的全部附件。"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" htmlType="submit" loading={submitting}>
          保存修改
        </Button>
      </div>
    </form>
  );
}
