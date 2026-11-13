import { useParams, Link } from "@tanstack/react-router";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Skeleton,
  Tag,
  Timeline,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState, NotFoundState } from "../../components/ErrorState";
import { MentorApplicationMaterialsPanel } from "./MentorApplicationMaterialsPanel";
import { useMyApplication, useWithdrawMyApplication } from "./queries";
import { ApiError } from "../../lib/api/client";
import {
  APPLICATION_TYPE_LABELS,
  MENTOR_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type {
  MentorProfileDraft,
  ReviewRecord,
} from "../../lib/api/types";
import { App } from "antd";

function SnapshotField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink">
        {value?.trim() ? value : "—"}
      </div>
    </div>
  );
}

function ReviewBlock({
  title,
  record,
  pendingText,
}: {
  title: string;
  record: ReviewRecord | null;
  pendingText: string;
}) {
  if (!record) {
    return (
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="mt-1 text-xs text-ink-muted">{pendingText}</div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink">{title}</span>
        <Tag color={record.decision === "approve" ? "success" : "error"}>
          {record.decision === "approve" ? "通过" : "不通过"}
        </Tag>
        <span className="text-xs text-ink-muted">
          {record.reviewerName} · {formatDateTime(record.at)}
        </span>
      </div>
      <div className="mt-1 text-sm text-ink-muted">{record.comment}</div>
    </div>
  );
}

export function MentorApplicationDetailPage() {
  const { id } = useParams({ from: "/_app/mentor/applications/$id" });
  const { message, modal } = App.useApp();
  const query = useMyApplication(id);
  const withdraw = useWithdrawMyApplication();

  if (query.isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
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

  const application = query.data;
  if (!application) return null;
  const snapshot: MentorProfileDraft = application.snapshot;
  const canWithdraw = [2, 3, 5].includes(application.status);
  const canEditMaterials = [2, 3].includes(application.status);

  function confirmWithdraw() {
    if (!application) return;
    modal.confirm({
      title: "撤回申请",
      content:
        "撤回后申请变为「已撤回」，档案回到可修改状态。确认撤回？",
      okText: "确认撤回",
      cancelText: "取消",
      onOk: async () => {
        try {
          await withdraw.mutateAsync(application.id);
          message.success("申请已撤回");
          await query.refetch();
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "撤回失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  return (
    <div>
      <PageHeader
        title={`申请 #${application.id}`}
        description="申请内容为提交时的快照；审核记录会随流程留痕。"
        back={
          <Link
            to="/mentor/applications"
            className="inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeftOutlined /> 返回我的申请
          </Link>
        }
        extra={
          <>
            <StatusTag kind="application" value={application.status} />
            {canWithdraw ? (
              <Button
                danger
                onClick={confirmWithdraw}
                loading={withdraw.isPending}
              >
                撤回申请
              </Button>
            ) : null}
          </>
        }
      />

      {application.status === 3 ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title="申请已被二级学院退回"
          description={
            <span>
              请根据审核意见修改档案后重新提交。
              <Link to="/mentor/profile" className="ml-1">
                去修改档案
              </Link>
            </span>
          }
        />
      ) : null}
      {application.status === 5 ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title="创新创业学院已退回"
          description="申请会回到二级学院重审路径；如需修改档案，请联系学院管理员。"
        />
      ) : null}
      {application.status === 6 ? (
        <Alert
          type="success"
          showIcon
          className="mb-4"
          title="申请已通过"
          description="档案已生效，可以接收学生预约。"
        />
      ) : null}

      <Card title="申请信息">
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            {
              key: "id",
              label: "申请编号",
              children: <span className="tabular">#{application.id}</span>,
            },
            {
              key: "type",
              label: "申请类型",
              children: (
                <Tag className="m-0">
                  {enumLabel(APPLICATION_TYPE_LABELS, application.type)}
                </Tag>
              ),
            },
            {
              key: "status",
              label: "当前状态",
              children: (
                <StatusTag kind="application" value={application.status} />
              ),
            },
            {
              key: "submittedAt",
              label: "提交时间",
              children: formatDateTime(application.submittedAt),
            },
            {
              key: "mentorType",
              label: "导师类型",
              children: enumLabel(MENTOR_TYPE_LABELS, snapshot.mentorType),
            },
          ]}
        />
      </Card>

      <Card
        title="申请时的内容（快照）"
        className="mt-4"
        extra={
          <span className="text-xs text-ink-muted">提交后不再随档案修改</span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SnapshotField
            label="职称 / 资质"
            value={snapshot.professionalTitle}
          />
          <div>
            <div className="text-xs text-ink-muted">指导方向</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {snapshot.researchFields.length ? (
                snapshot.researchFields.map((field) => (
                  <Tag key={field} className="m-0">
                    {field}
                  </Tag>
                ))
              ) : (
                <span className="text-sm text-ink">—</span>
              )}
            </div>
          </div>
          <SnapshotField label="合作单位" value={snapshot.affiliateOrg} />
          <SnapshotField label="社会任职" value={snapshot.socialRoles} />
          <div className="sm:col-span-2">
            <SnapshotField label="个人简介" value={snapshot.summary} />
          </div>
          <div className="sm:col-span-2">
            <SnapshotField label="研究成果" value={snapshot.achievements} />
          </div>
          <div className="sm:col-span-2">
            <SnapshotField
              label="指导经历"
              value={snapshot.guidanceExperience}
            />
          </div>
        </div>
      </Card>

      <Card title="审核记录" className="mt-4">
        <Timeline
          items={[
            {
              color: application.collegeReview
                ? application.collegeReview.decision === "approve"
                  ? "green"
                  : "red"
                : "gray",
              content: (
                <ReviewBlock
                  title="二级学院审核"
                  record={application.collegeReview}
                  pendingText="尚未审核"
                />
              ),
            },
            {
              color: application.scReview
                ? application.scReview.decision === "approve"
                  ? "green"
                  : "red"
                : "gray",
              content: (
                <ReviewBlock
                  title="创新创业学院审核"
                  record={application.scReview}
                  pendingText="尚未进入创新创业学院审核"
                />
              ),
            },
          ]}
        />
      </Card>

      <MentorApplicationMaterialsPanel
        applicationId={application.id}
        canEdit={canEditMaterials}
      />
    </div>
  );
}
