import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Skeleton,
  Tag,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { StatusTag } from "../../components/StatusTag";
import { CompactEmpty } from "../../components/CompactEmpty";
import { QueryErrorState, NotFoundState } from "../../components/ErrorState";
import { MentorAppointmentMaterialsPanel } from "./MentorAppointmentMaterialsPanel";
import {
  ConfirmAppointmentModal,
  GuidanceRecordModal,
  RejectAppointmentModal,
  RescheduleAppointmentModal,
} from "./MentorAppointmentModals";
import {
  useAppointment,
  useGuidanceRecord,
} from "../appointments/queries";
import { useAppointmentReview } from "./queries";
import { ApiError } from "../../lib/api/client";
import {
  APPOINTMENT_MODE_LABELS,
  APPOINTMENT_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";
import {
  formatDateTime,
  formatDuration,
} from "../../lib/format";

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

export function MentorAppointmentDetailPage() {
  const { id } = useParams({ from: "/_app/mentor/appointments/$id" });
  const appointment = useAppointment(id);
  const record = useGuidanceRecord(id);
  const review = useAppointmentReview(id, appointment.data?.status === 6);

  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [recording, setRecording] = useState(false);

  if (appointment.isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (appointment.isError) {
    if (
      appointment.error instanceof ApiError &&
      appointment.error.httpStatus === 404
    ) {
      return <NotFoundState message={appointment.error.message} />;
    }
    return (
      <QueryErrorState
        error={appointment.error}
        onRetry={() => void appointment.refetch()}
      />
    );
  }

  const data = appointment.data;
  if (!data) return null;

  const recordMissing =
    record.isError &&
    record.error instanceof ApiError &&
    record.error.httpStatus === 404;
  const canHandle = data.status === 0;
  const canRecord = data.status === 1 || data.status === 3;
  const canUploadMaterials = [3, 4, 5, 6].includes(data.status);

  function refreshAll() {
    void appointment.refetch();
    void record.refetch();
    if (data?.status === 6) void review.refetch();
  }

  return (
    <div>
      <PageHeader
        title={`预约 #${data.id}`}
        description={`${data.student?.realName ?? "学生"} · ${enumLabel(APPOINTMENT_TYPE_LABELS, data.type)}`}
        back={
          <Link
            to="/mentor/appointments"
            className="inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeftOutlined /> 返回预约列表
          </Link>
        }
        extra={
          <>
            <StatusTag kind="appointment" value={data.status} />
            {canHandle ? (
              <>
                <Button type="primary" onClick={() => setConfirming(true)}>
                  确认预约
                </Button>
                <Button danger onClick={() => setRejecting(true)}>
                  拒绝
                </Button>
                <Button onClick={() => setRescheduling(true)}>改期建议</Button>
              </>
            ) : null}
            {canRecord ? (
              <Button type="primary" onClick={() => setRecording(true)}>
                {data.status === 3 ? "重填指导记录" : "填报指导记录"}
              </Button>
            ) : null}
          </>
        }
      />

      {data.status === 5 ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title="学生对指导记录提出异议"
          description={data.disputeReason ?? "等待学院复核"}
        />
      ) : null}
      {data.status === 7 ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title="预约已被拒绝"
          description={data.rejectReason ?? "—"}
        />
      ) : null}
      {data.status === 8 || data.status === 9 ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          title={data.status === 8 ? "预约已取消" : "预约已过期"}
        />
      ) : null}

      <Card title="预约信息">
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            {
              key: "id",
              label: "预约编号",
              children: <span className="tabular">#{data.id}</span>,
            },
            {
              key: "type",
              label: "预约类型",
              children: enumLabel(APPOINTMENT_TYPE_LABELS, data.type),
            },
            {
              key: "status",
              label: "当前状态",
              children: <StatusTag kind="appointment" value={data.status} />,
            },
            {
              key: "requestedTime",
              label: "期望时间",
              children: formatDateTime(data.requestedTime),
            },
            {
              key: "proposedTime",
              label: "改期建议",
              children: formatDateTime(data.proposedTime),
            },
            {
              key: "mode",
              label: "对接方式",
              children: enumLabel(APPOINTMENT_MODE_LABELS, data.mode),
            },
          ]}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextBlock label="指导主题" value={data.topic} />
          <TextBlock label="拟咨询问题" value={data.questions} />
          <TextBlock label="导师处理意见" value={data.handleComment} />
          <TextBlock label="管理员复核意见" value={data.adjudicateComment} />
        </div>
      </Card>

      <Card title="学生信息" className="mt-4">
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            {
              key: "name",
              label: "姓名",
              children: data.student?.realName ?? "—",
            },
            {
              key: "login",
              label: "学号",
              children: <span className="tabular">{data.student?.login ?? "—"}</span>,
            },
            {
              key: "org",
              label: "学院",
              children: data.student?.orgUnitName ?? "—",
            },
            {
              key: "major",
              label: "专业",
              children: data.student?.major ?? "—",
            },
            {
              key: "class",
              label: "行政班级",
              children: data.student?.className ?? "—",
            },
            {
              key: "mobile",
              label: "联系电话",
              children: data.student?.mobile ?? "—",
            },
          ]}
        />
      </Card>

      <Card title="指导记录" className="mt-4">
        {record.isLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : recordMissing ? (
          <CompactEmpty text="尚未填报指导记录" />
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
              ]}
            />
            <div className="mt-4 grid gap-4">
              <TextBlock
                label="核心指导内容"
                value={record.data.coreContent}
              />
              <TextBlock
                label="后续指导建议"
                value={record.data.followUp}
              />
            </div>
          </>
        ) : null}
      </Card>

      {data.status === 6 ? (
        <Card title="学生评价" className="mt-4">
          {review.isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : review.data ? (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-base font-medium text-ink">
                  综合 {review.data.overallScore} 分
                </span>
                <Tag className="m-0">态度 {review.data.attitude}</Tag>
                <Tag className="m-0">能力 {review.data.expertise}</Tag>
                <Tag className="m-0">效果 {review.data.effect}</Tag>
                <span className="ml-auto text-xs text-ink-muted">
                  {formatDateTime(review.data.createdAt)}
                </span>
              </div>
              <p className="mt-3 mb-0 whitespace-pre-wrap text-sm text-ink-muted">
                {review.data.comment || "学生未填写文字评价"}
              </p>
            </div>
          ) : (
            <CompactEmpty text="学生尚未提交评价" />
          )}
        </Card>
      ) : null}

      <MentorAppointmentMaterialsPanel
        appointmentId={data.id}
        canUpload={canUploadMaterials}
      />

      <ConfirmAppointmentModal
        open={confirming}
        appointmentId={data.id}
        onClose={() => setConfirming(false)}
        onSuccess={refreshAll}
      />
      <RejectAppointmentModal
        open={rejecting}
        appointmentId={data.id}
        onClose={() => setRejecting(false)}
        onSuccess={refreshAll}
      />
      <RescheduleAppointmentModal
        open={rescheduling}
        appointmentId={data.id}
        initialTime={data.proposedTime ?? data.requestedTime}
        onClose={() => setRescheduling(false)}
        onSuccess={refreshAll}
      />
      <GuidanceRecordModal
        open={recording}
        appointmentId={data.id}
        initial={record.data ?? null}
        onClose={() => setRecording(false)}
        onSuccess={refreshAll}
      />
    </div>
  );
}
