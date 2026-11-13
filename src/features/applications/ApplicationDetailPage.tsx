import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Skeleton,
  Tag,
  Timeline,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState, NotFoundState } from "../../components/ErrorState";
import { MaterialsPanel } from "./MaterialsPanel";
import { ReviewModal } from "./ReviewModal";
import { useApplication } from "./queries";
import type { ReviewKind } from "./queries";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import {
  APPLICATION_TYPE_LABELS,
  MENTOR_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type { MentorProfileDraft, ReviewRecord } from "../../lib/api/types";

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

export function ApplicationDetailPage() {
  const { id } = useParams({ from: "/_app/applications/$id" });
  const { can } = useAuth();
  const query = useApplication(id);
  const [reviewKind, setReviewKind] = useState<ReviewKind | null>(null);

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

  const application = query.data;
  if (!application) return null;

  const canCollege =
    can("mentor-application:review-college") &&
    [2, 5].includes(application.status);
  const canSc =
    can("mentor-application:review-sc") && application.status === 4;

  const snapshot: MentorProfileDraft = application.snapshot;

  return (
    <div>
      <PageHeader
        title={`入驻申请 #${application.id}`}
        description="申请内容为提交时的快照，审核记录会随流程留痕。"
        back={
          <Link to="/applications" className="inline-flex items-center gap-1 text-sm">
            <ArrowLeftOutlined /> 返回申请列表
          </Link>
        }
        extra={
          <>
            {canCollege ? (
              <Button type="primary" onClick={() => setReviewKind("college")}>
                二级学院审核
              </Button>
            ) : null}
            {canSc ? (
              <Button type="primary" onClick={() => setReviewKind("sc")}>
                创新创业学院审核
              </Button>
            ) : null}
          </>
        }
      />

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
              key: "applicant",
              label: "申请人编号",
              children: (
                <span className="tabular">#{application.applicantId}</span>
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
          <span className="text-xs text-ink-muted">
            提交后不再随档案修改
          </span>
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
        {!application.collegeReview && !application.scReview ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无审核记录"
            className="my-0!"
          />
        ) : null}
      </Card>

      <MaterialsPanel applicationId={application.id} />

      <ReviewModal
        open={reviewKind !== null}
        applicationId={application.id}
        kind={reviewKind ?? "college"}
        onClose={() => setReviewKind(null)}
        onSuccess={() => void query.refetch()}
      />
    </div>
  );
}
