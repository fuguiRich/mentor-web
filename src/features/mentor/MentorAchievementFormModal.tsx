import { useEffect, useState } from "react";
import { App, Button, Input, Modal, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXT,
  UPLOAD_MAX_SIZE_MB,
  UploadLimitHint,
  uploadFileExt,
} from "../../components/UploadLimitHint";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_TYPE_LABELS,
  toOptions,
} from "../../lib/enums";
import { todayDate } from "../../lib/format";
import { uploadFiles } from "../../lib/api/endpoints/mentor";
import type { Achievement } from "../../lib/api/types";
import {
  useCreateAchievement,
  useUpdateAchievement,
} from "./queries";

const MAX_SIZE = UPLOAD_MAX_SIZE_MB * 1024 * 1024;

const schema = z.object({
  type: z.number().int().min(1).max(3),
  title: z
    .string()
    .trim()
    .min(1, "请输入成果名称")
    .max(200, "成果名称不能超过 200 个字符"),
  level: z.number().int().min(1).max(5),
  awardedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "请选择获奖 / 立项日期"),
  description: z.string().max(1000, "说明不能超过 1000 个字符").optional(),
  proofFileId: z
    .string()
    .regex(/^\d*$/, "佐证文件 ID 必须是数字")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export function MentorAchievementFormModal({
  open,
  mentorId,
  achievement,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mentorId: string;
  achievement: Achievement | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const createMutation = useCreateAchievement(mentorId);
  const updateMutation = useUpdateAchievement(mentorId);
  const [submitting, setSubmitting] = useState(false);
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 1,
      title: "",
      level: 2,
      awardedAt: todayDate(),
      description: "",
      proofFileId: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      achievement
        ? {
            type: achievement.type,
            title: achievement.title,
            level: achievement.level,
            awardedAt: achievement.awardedAt,
            description: achievement.description ?? "",
            proofFileId: achievement.proofFileId ?? "",
          }
        : {
            type: 1,
            title: "",
            level: 2,
            awardedAt: todayDate(),
            description: "",
            proofFileId: "",
          },
    );
    setProofName(null);
  }, [open, achievement, form]);

  async function uploadProof(file: File) {
    if (!UPLOAD_ALLOWED_EXT.includes(uploadFileExt(file.name))) {
      message.error(`「${file.name}」类型不支持，仅支持图片或 PDF`);
      return;
    }
    if (file.size > MAX_SIZE) {
      message.error(`「${file.name}」超过 ${UPLOAD_MAX_SIZE_MB} MB`);
      return;
    }
    setProofUploading(true);
    try {
      const [uploaded] = await uploadFiles([file]);
      form.setValue("proofFileId", uploaded.id);
      setProofName(file.name);
      message.success("佐证文件已上传");
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "上传失败，请稍后重试",
      );
    } finally {
      setProofUploading(false);
    }
  }

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      if (achievement) {
        await updateMutation.mutateAsync({
          achievementId: achievement.id,
          body: {
            title: values.title.trim(),
            level: Number(values.level),
            awardedAt: values.awardedAt,
            description: values.description?.trim() || undefined,
            proofFileId: values.proofFileId?.trim() || undefined,
          },
        });
        message.success("成果已更新");
      } else {
        await createMutation.mutateAsync({
          type: Number(values.type),
          title: values.title.trim(),
          level: Number(values.level),
          awardedAt: values.awardedAt,
          description: values.description?.trim() || undefined,
          proofFileId: values.proofFileId?.trim() || undefined,
        });
        message.success("成果已登记");
      }
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
      title={achievement ? "编辑双创成果" : "登记双创成果"}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      width={640}
      destroyOnHidden
    >
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="type"
          label="成果类型"
          required
          extra={achievement ? "类型创建后不可修改" : undefined}
        >
          {(field) => (
            <Select
              value={Number(field.value)}
              onChange={field.onChange}
              disabled={Boolean(achievement)}
              options={toOptions(ACHIEVEMENT_TYPE_LABELS, [1, 2, 3])}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="level"
          label="成果级别"
          required
        >
          {(field) => (
            <Select
              value={Number(field.value)}
              onChange={field.onChange}
              options={toOptions(ACHIEVEMENT_LEVEL_LABELS, [1, 2, 3, 4, 5])}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
      </div>
      <FormField
        control={form.control}
        name="title"
        label="成果名称"
        required
      >
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={200}
            showCount
            placeholder="例如：中国国际大学生创新大赛省级银奖"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="awardedAt"
        label="获奖 / 立项日期"
        required
      >
        {(field) => (
          <Input
            type="date"
            value={field.value ?? ""}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="description"
        label="说明"
        extra={`${form.watch("description")?.length ?? 0} / 1000`}
      >
        {(field) => (
          <Input.TextArea
            {...field}
            value={field.value ?? ""}
            rows={3}
            maxLength={1000}
            placeholder="团队规模、本人角色、成果简介等"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="proofFileId"
        label="佐证文件"
        extra="可选；上传后自动关联到本条成果"
      >
        {(field) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
              {proofName ?? (field.value ? "已上传" : "未上传")}
            </span>
            <Upload
              showUploadList={false}
              accept={UPLOAD_ACCEPT}
              beforeUpload={(file) => {
                if (!UPLOAD_ALLOWED_EXT.includes(uploadFileExt(file.name))) {
                  message.error(`「${file.name}」类型不支持，仅支持图片或 PDF`);
                  return Upload.LIST_IGNORE;
                }
                if (file.size > MAX_SIZE) {
                  message.error(`「${file.name}」超过 ${UPLOAD_MAX_SIZE_MB} MB`);
                  return Upload.LIST_IGNORE;
                }
                void uploadProof(file as File);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} loading={proofUploading}>
                上传
              </Button>
            </Upload>
            {field.value ? (
              <Button
                type="link"
                danger
                size="small"
                onClick={() => {
                  form.setValue("proofFileId", "");
                  setProofName(null);
                }}
              >
                移除
              </Button>
            ) : null}
            {proofName ? (
              <span className="text-xs text-ink-muted">{proofName}</span>
            ) : null}
            <UploadLimitHint maxCount={1} className="mt-1.5 w-full" />
          </div>
        )}
      </FormField>
    </Modal>
  );
}
