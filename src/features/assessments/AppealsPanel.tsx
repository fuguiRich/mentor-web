import { useEffect, useState } from "react";
import { App, Button, Card, Empty, Input, Modal, Radio } from "antd";
import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable } from "../../components/DataTable";
import { FilePreview } from "../../components/FilePreview";
import { FormField } from "../../components/FormField";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import { downloadWithAuth } from "../../lib/download";
import {
  downloadAppealFile,
  previewAppealFile,
} from "../../lib/api/endpoints/assessments";
import { applyApiFieldErrors } from "../../lib/forms";
import { formatDateTime } from "../../lib/format";
import type { Appeal, FileRef } from "../../lib/api/types";
import { useAppeals, useHandleAppeal } from "./queries";

const schema = z.object({
  decision: z.enum(["accept", "reject"]),
  reply: z
    .string()
    .trim()
    .min(1, "请填写处理意见")
    .max(1000, "处理意见不能超过 1000 个字符"),
});

type FormValues = z.infer<typeof schema>;

export function AppealsPanel({ assessmentId }: { assessmentId: string }) {
  const { can } = useAuth();
  const { message } = App.useApp();
  const query = useAppeals(assessmentId, { page: 1, pageSize: 50 });
  const mutation = useHandleAppeal(assessmentId);
  const [target, setTarget] = useState<Appeal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<{
    appealId: string;
    file: FileRef;
  } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(appealId: string, file: FileRef) {
    const key = `${appealId}-${file.id}`;
    setDownloading(key);
    try {
      await downloadWithAuth(
        () => downloadAppealFile(assessmentId, appealId, file.id),
        file.originName,
      );
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "下载失败，请稍后重试",
      );
    } finally {
      setDownloading(null);
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { decision: "accept", reply: "" },
  });

  useEffect(() => {
    if (target) form.reset({ decision: "accept", reply: "" });
  }, [target, form]);

  async function submit(values: FormValues) {
    if (!target) return;
    setSubmitting(true);
    try {
      await mutation.mutateAsync({ appealId: target.id, body: values });
      message.success("申诉处理已提交");
      setTarget(null);
      void query.refetch();
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

  const canHandle = can("assessment:appeal-handle");

  return (
    <Card title="考核申诉" className="mt-4">
      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<Appeal>
          dataSource={query.data?.list ?? []}
          loading={query.isLoading}
          pagination={false}
          wrapped={false}
          columns={[
            {
              title: "申诉原因",
              dataIndex: "reason",
              key: "reason",
              ellipsis: true,
            },
            {
              title: "佐证",
              key: "files",
              width: 220,
              render: (_, record) =>
                record.files?.length ? (
                  <div className="space-y-1">
                    {record.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-1"
                      >
                        <Button
                          type="link"
                          size="small"
                          className="max-w-[140px] truncate p-0!"
                          icon={<EyeOutlined />}
                          onClick={() =>
                            setPreview({ appealId: record.id, file })
                          }
                        >
                          {file.originName}
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          loading={
                            downloading === `${record.id}-${file.id}`
                          }
                          onClick={() =>
                            void handleDownload(record.id, file)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  "—"
                ),
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 100,
              render: (status: number) => (
                <StatusTag kind="appeal" value={status} />
              ),
            },
            {
              title: "提交人",
              key: "submittedBy",
              width: 120,
              render: (_, record) => record.submittedBy?.name ?? "—",
            },
            {
              title: "处理人",
              key: "handledBy",
              width: 120,
              render: (_, record) => record.handledBy?.name ?? "—",
            },
            {
              title: "处理意见",
              dataIndex: "reply",
              key: "reply",
              ellipsis: true,
              render: (value: string | null) => value || "—",
            },
            {
              title: "提交时间",
              dataIndex: "createdAt",
              key: "createdAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "处理时间",
              dataIndex: "handledAt",
              key: "handledAt",
              width: 170,
              render: (value: string | null) => formatDateTime(value),
            },
            {
              title: "操作",
              key: "actions",
              width: 90,
              render: (_, record) =>
                canHandle && record.status === 0 ? (
                  <Button type="link" size="small" onClick={() => setTarget(record)}>
                    处理
                  </Button>
                ) : (
                  "—"
                ),
            },
          ]}
          emptyText={<Empty description="暂无申诉" />}
        />
      )}

      <Modal
        open={Boolean(target)}
        title="处理考核申诉"
        onCancel={() => setTarget(null)}
        okText="提交处理"
        cancelText="取消"
        confirmLoading={submitting}
        onOk={() => void form.handleSubmit(submit)()}
      >
        <div className="mb-4 rounded-md bg-muted px-3 py-2 text-sm">
          <div className="text-xs text-ink-muted">申诉原因</div>
          <div className="mt-1 whitespace-pre-wrap text-ink">
            {target?.reason}
          </div>
        </div>
        <FormField
          control={form.control}
          name="decision"
          label="处理决定"
          required
          extra="受理只表示已收到并将复核，不会自动改变考核结果。"
        >
          {(field) => (
            <Radio.Group
              {...field}
              options={[
                { label: "受理", value: "accept" },
                { label: "驳回", value: "reject" },
              ]}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="reply"
          label="处理意见"
          required
        >
          {(field) => (
            <Input.TextArea
              {...field}
              value={field.value ?? ""}
              rows={4}
              maxLength={1000}
              showCount
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
      </Modal>

      <FilePreview
        open={Boolean(preview)}
        title={preview?.file.originName ?? "申诉佐证预览"}
        mimeType={preview?.file.mimeType}
        loader={
          preview
            ? () =>
                previewAppealFile(
                  assessmentId,
                  preview.appealId,
                  preview.file.id,
                )
            : null
        }
        onClose={() => setPreview(null)}
      />
    </Card>
  );
}
