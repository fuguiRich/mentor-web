import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Skeleton,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { StatusTag } from "../../components/StatusTag";
import { DataTable } from "../../components/DataTable";
import { FilePreview } from "../../components/FilePreview";
import { QueryErrorState, NotFoundState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { AdjudicateModal } from "./AdjudicateModal";
import {
  useAppointment,
  useAppointmentMaterials,
  useGuidanceRecord,
} from "./queries";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import {
  APPOINTMENT_MATERIAL_KIND_LABELS,
  APPOINTMENT_MODE_LABELS,
  APPOINTMENT_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";
import {
  formatDateTime,
  formatDuration,
  formatFileSize,
} from "../../lib/format";
import { downloadWithAuth } from "../../lib/download";
import { downloadFile, previewFile } from "../../lib/api/endpoints/system";
import type { AppointmentMaterial } from "../../lib/api/types";
import { App } from "antd";

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink">
        {value?.trim() ? value : "—"}
      </div>
    </div>
  );
}

export function AppointmentDetailPage() {
  const { id } = useParams({ from: "/_app/appointments/$id" });
  const { can } = useAuth();
  const { message } = App.useApp();
  const query = useAppointment(id);
  const record = useGuidanceRecord(id);
  const materials = useAppointmentMaterials(id);
  const [adjudicating, setAdjudicating] = useState(false);
  const [preview, setPreview] = useState<AppointmentMaterial | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 3 }} />
        <Skeleton active paragraph={{ rows: 8 }} className="mt-6" />
      </div>
    );
  }

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.httpStatus === 404) {
      return <NotFoundState message={query.error.message} />;
    }
    return (
      <QueryErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const appointment = query.data;
  if (!appointment) return null;

  const canAdjudicate =
    can("appointment:adjudicate") && appointment.status === 5;
  const recordMissing =
    record.isError &&
    record.error instanceof ApiError &&
    record.error.httpStatus === 404;

  async function handleDownload(material: AppointmentMaterial) {
    setDownloading(material.id);
    try {
      await downloadWithAuth(
        () => downloadFile(material.fileId),
        material.originName,
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "下载失败，请稍后重试",
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <PermissionGuard code="appointment:list">
      <PageHeader
        title={`预约 #${appointment.id}`}
        description={`${appointment.student?.realName ?? "学生"} → ${appointment.mentor?.realName ?? "导师"}`}
        back={
          <Link
            to="/appointments"
            className="inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeftOutlined /> 返回预约列表
          </Link>
        }
        extra={
          canAdjudicate ? (
            <Button type="primary" onClick={() => setAdjudicating(true)}>
              异议复核
            </Button>
          ) : null
        }
      />

      <Card title="预约信息">
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            {
              key: "id",
              label: "预约编号",
              children: <span className="tabular">#{appointment.id}</span>,
            },
            {
              key: "type",
              label: "预约类型",
              children: enumLabel(APPOINTMENT_TYPE_LABELS, appointment.type),
            },
            {
              key: "status",
              label: "当前状态",
              children: (
                <StatusTag kind="appointment" value={appointment.status} />
              ),
            },
            {
              key: "requestedTime",
              label: "期望时间",
              children: formatDateTime(appointment.requestedTime),
            },
            {
              key: "proposedTime",
              label: "导师建议时间",
              children: formatDateTime(appointment.proposedTime),
            },
            {
              key: "mode",
              label: "对接方式",
              children: enumLabel(APPOINTMENT_MODE_LABELS, appointment.mode),
            },
            {
              key: "slot",
              label: "命中时段编号",
              children: appointment.slotId ? (
                <span className="tabular">#{appointment.slotId}</span>
              ) : (
                "—"
              ),
            },
          ]}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextBlock label="指导主题" value={appointment.topic} />
          <TextBlock label="拟咨询问题" value={appointment.questions} />
        </div>
      </Card>

      <Card title="处理记录" className="mt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextBlock
            label="导师处理意见"
            value={appointment.handleComment}
          />
          <TextBlock label="拒绝原因" value={appointment.rejectReason} />
          <TextBlock
            label="学生异议原因"
            value={appointment.disputeReason}
          />
          <TextBlock
            label="管理员复核意见"
            value={appointment.adjudicateComment}
          />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="学生信息">
          <Descriptions
            column={1}
            items={[
              {
                key: "name",
                label: "姓名",
                children: appointment.student?.realName ?? "—",
              },
              {
                key: "login",
                label: "学号",
                children: appointment.student?.login ?? "—",
              },
              {
                key: "org",
                label: "学院",
                children: appointment.student?.orgUnitName ?? "—",
              },
              {
                key: "major",
                label: "专业",
                children: appointment.student?.major ?? "—",
              },
              {
                key: "class",
                label: "行政班级",
                children: appointment.student?.className ?? "—",
              },
              {
                key: "mobile",
                label: "联系电话",
                children: appointment.student?.mobile ?? "—",
              },
            ]}
          />
        </Card>
        <Card title="导师信息">
          <Descriptions
            column={1}
            items={[
              {
                key: "name",
                label: "姓名",
                children: appointment.mentor?.realName ?? "—",
              },
              {
                key: "org",
                label: "所属单位",
                children: appointment.mentor?.orgUnitName ?? "—",
              },
              {
                key: "profile",
                label: "导师档案",
                children: appointment.mentorProfileId ? (
                  <Link
                    to="/mentors/$id"
                    params={{ id: appointment.mentorProfileId }}
                  >
                    查看档案
                  </Link>
                ) : (
                  "—"
                ),
              },
            ]}
          />
        </Card>
      </div>

      <Card title="指导记录" className="mt-4">
        {record.isLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : recordMissing ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="导师尚未提交指导记录"
          />
        ) : record.isError ? (
          <QueryErrorState
            error={record.error}
            onRetry={() => void record.refetch()}
          />
        ) : record.data ? (
          <>
            <Descriptions
              column={{ xs: 1, sm: 2, lg: 3 }}
              items={[
                {
                  key: "actualTime",
                  label: "实际指导时间",
                  children: formatDateTime(record.data.actualTime),
                },
                {
                  key: "duration",
                  label: "指导时长",
                  children: formatDuration(record.data.durationMinutes),
                },
                {
                  key: "mode",
                  label: "指导方式",
                  children: enumLabel(
                    APPOINTMENT_MODE_LABELS,
                    record.data.mode,
                  ),
                },
                {
                  key: "submittedAt",
                  label: "提交时间",
                  children: formatDateTime(record.data.submittedAt),
                },
                {
                  key: "student",
                  label: "学生",
                  children: `${record.data.student.realName}（${record.data.student.login}）`,
                },
              ]}
            />
            <div className="mt-4 grid gap-4">
              <TextBlock label="核心指导内容" value={record.data.coreContent} />
              <TextBlock label="后续指导建议" value={record.data.followUp} />
            </div>
          </>
        ) : null}
      </Card>

      <Card title="预约与过程材料" className="mt-4">
        {materials.isError ? (
          <QueryErrorState
            error={materials.error}
            onRetry={() => void materials.refetch()}
          />
        ) : (
          <DataTable<AppointmentMaterial>
            dataSource={materials.data?.list ?? []}
            loading={materials.isLoading}
            pagination={false}
            wrapped={false}
            columns={[
              {
                title: "来源",
                dataIndex: "source",
                key: "source",
                width: 110,
                render: (source: string) => (
                  <Tag className="m-0">
                    {source === "record" ? "过程材料" : "预约材料"}
                  </Tag>
                ),
              },
              {
                title: "类型",
                dataIndex: "kind",
                key: "kind",
                width: 140,
                render: (kind: number | null, material) =>
                  material.source === "record" || kind === null
                    ? "过程材料"
                    : enumLabel(APPOINTMENT_MATERIAL_KIND_LABELS, kind),
              },
              {
                title: "文件名",
                dataIndex: "originName",
                key: "originName",
                ellipsis: true,
              },
              {
                title: "大小",
                dataIndex: "size",
                key: "size",
                width: 100,
                render: (size: number) => formatFileSize(size),
              },
              {
                title: "上传时间",
                dataIndex: "createdAt",
                key: "createdAt",
                width: 170,
                render: (value: string) => formatDateTime(value),
              },
              {
                title: "操作",
                key: "actions",
                width: 150,
                render: (_, material) => (
                  <div className="table-actions">
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setPreview(material)}
                    >
                      预览
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<DownloadOutlined />}
                      loading={downloading === material.id}
                      onClick={() => void handleDownload(material)}
                    >
                      下载
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyText={<Empty description="暂无材料" />}
          />
        )}
      </Card>

      <AdjudicateModal
        open={adjudicating}
        appointmentId={appointment.id}
        onClose={() => setAdjudicating(false)}
        onSuccess={() => void query.refetch()}
      />

      <FilePreview
        open={Boolean(preview)}
        title={preview?.originName ?? "材料预览"}
        mimeType={preview?.mimeType}
        loader={preview ? () => previewFile(preview.fileId) : null}
        onClose={() => setPreview(null)}
      />
    </PermissionGuard>
  );
}
