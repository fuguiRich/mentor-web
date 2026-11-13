import { useEffect, useState } from "react";
import { App, Alert, Button, Input, Modal, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXT,
  UPLOAD_MAX_SIZE_MB,
  UploadLimitHint,
  uploadFileExt,
} from "../../components/UploadLimitHint";
import { ApiError } from "../../lib/api/client";
import { uploadFiles } from "../../lib/api/endpoints/mentor";
import { applyApiFieldErrors } from "../../lib/forms";
import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_TYPE_LABELS,
  toOptions,
} from "../../lib/enums";
import { todayDate } from "../../lib/format";
import {
  useCreateStudentAchievement,
  useMentorOptions,
  useStudentOptions,
} from "./queries";

const MAX_SIZE = UPLOAD_MAX_SIZE_MB * 1024 * 1024;

const schema = z.object({
  studentPersonId: z
    .string()
    .trim()
    .regex(/^\d+$/, "学生 ID 必须是数字"),
  mentorProfileId: z.string().optional(),
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
  proofFileId: z
    .string()
    .regex(/^\d*$/, "佐证文件 ID 必须是数字")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateStudentAchievementModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStudentAchievementModal({
  open,
  onClose,
  onSuccess,
}: CreateStudentAchievementModalProps) {
  const { message } = App.useApp();
  const { can } = useAuth();
  const canUploadProof = can("file:create");
  const mutation = useCreateStudentAchievement();
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [studentKeyword, setStudentKeyword] = useState("");
  const [studentDebounced, setStudentDebounced] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const students = useStudentOptions(studentDebounced || undefined, open);
  const mentors = useMentorOptions(debounced || undefined);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const timer = setTimeout(
      () => setStudentDebounced(studentKeyword.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [studentKeyword]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentPersonId: "",
      mentorProfileId: undefined,
      type: 1,
      title: "",
      level: 2,
      awardedAt: todayDate(),
      proofFileId: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      studentPersonId: "",
      mentorProfileId: undefined,
      type: 1,
      title: "",
      level: 2,
      awardedAt: todayDate(),
      proofFileId: "",
    });
    setKeyword("");
    setDebounced("");
    setStudentKeyword("");
    setStudentDebounced("");
    setProofName(null);
  }, [open, form]);

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
      await mutation.mutateAsync({
        studentPersonId: values.studentPersonId.trim(),
        mentorProfileId: values.mentorProfileId || undefined,
        type: Number(values.type),
        title: values.title.trim(),
        level: Number(values.level),
        awardedAt: values.awardedAt,
        proofFileId: values.proofFileId?.trim() || undefined,
      });
      message.success("学生成果已登记");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "登记失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="登记学生双创成果"
      onCancel={onClose}
      okText="登记成果"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      width={640}
    >
      <p className="mb-4 text-sm text-ink-muted">
        可先登记未关联成果，之后再关联导师；关联会同步生成导师成果与归档条目。
      </p>
      <FormField
        control={form.control}
        name="studentPersonId"
        label="学生"
        required
        extra="输入姓名或学号搜索"
      >
        {(field) => (
          <Select
            showSearch
            filterOption={false}
            value={field.value || undefined}
            onChange={field.onChange}
            onSearch={setStudentKeyword}
            loading={students.isFetching}
            placeholder="搜索并选择学生"
            style={{ width: "100%" }}
            options={students.data ?? []}
            notFoundContent={
              students.isFetching ? "搜索中…" : "没有匹配的学生"
            }
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="mentorProfileId"
        label="关联导师"
        extra="可留空，稍后在列表里关联"
      >
        {(field) => (
          <Select
            allowClear
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
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="type"
          label="成果类型"
          required
        >
          {(field) => (
            <Select
              value={Number(field.value)}
              onChange={field.onChange}
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
              {...field}
              value={field.value ?? ""}
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
        {(field) =>
          canUploadProof ? (
            <div className="flex flex-wrap items-center gap-2">
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
                  {field.value ? "重新上传" : "上传佐证"}
                </Button>
              </Upload>
              {field.value ? (
                <Button
                  type="link"
                  size="small"
                  danger
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
          ) : (
            <Alert
              type="warning"
              showIcon
              title="当前账号缺少上传文件权限"
              description="上传佐证需要 file:create 权限；可先登记成果，待权限开通后再补充佐证。"
            />
          )
        }
      </FormField>
    </Modal>
  );
}
