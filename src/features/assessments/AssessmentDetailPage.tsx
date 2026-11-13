import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  Descriptions,
  Skeleton,
  Tag,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState, NotFoundState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { CollegeReviewModal } from "./CollegeReviewModal";
import { FinalReviewModal } from "./FinalReviewModal";
import { AppealsPanel } from "./AppealsPanel";
import { MentorAppealModal } from "../mentor/MentorAppealModal";
import { useAssessment, useMentorNameMap } from "./queries";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import {
  ASSESSMENT_GRADE_LABELS,
  enumLabel,
} from "../../lib/enums";
import { formatDateTime, formatDuration } from "../../lib/format";

export function AssessmentDetailPage() {
  const { id } = useParams({ from: "/_app/assessments/$id" });
  const { can } = useAuth();
  const query = useAssessment(id);
  const mentors = useMentorNameMap();
  const [collegeReviewing, setCollegeReviewing] = useState(false);
  const [finalReviewing, setFinalReviewing] = useState(false);
  const [appealing, setAppealing] = useState(false);

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

  const assessment = query.data;
  if (!assessment) return null;

  const mentorName =
    assessment.mentor?.name ??
    mentors.map.get(assessment.mentorProfileId) ??
    `导师编号 #${assessment.mentorProfileId}`;
  const canCollege =
    can("assessment:evaluate") && [0, 3].includes(assessment.status);
  const canFinal =
    can("assessment:finalize") && assessment.status === 1;
  const canAppeal =
    can("assessment:appeal") && assessment.status === 2;

  const weights = assessment.weights;
  const metrics = assessment.metrics;

  return (
    <PermissionGuard code="assessment:list">
      <PageHeader
        title={`考核 #${assessment.id}`}
        description={`${mentorName} · ${assessment.period}`}
        back={
          <Link
            to="/assessments"
            className="inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeftOutlined /> 返回考核列表
          </Link>
        }
        extra={
          <>
            {canCollege ? (
              <Button type="primary" onClick={() => setCollegeReviewing(true)}>
                提交初评
              </Button>
            ) : null}
            {canFinal ? (
              <Button type="primary" onClick={() => setFinalReviewing(true)}>
                考核终评
              </Button>
            ) : null}
            {canAppeal ? (
              <Button type="primary" onClick={() => setAppealing(true)}>
                提交申诉
              </Button>
            ) : null}
          </>
        }
      />

      <Card title="基本信息">
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            {
              key: "id",
              label: "考核编号",
              children: <span className="tabular">#{assessment.id}</span>,
            },
            {
              key: "mentor",
              label: "导师",
              children: (
                <Link
                  to="/mentors/$id"
                  params={{ id: assessment.mentorProfileId }}
                >
                  {mentorName}
                </Link>
              ),
            },
            {
              key: "mentorDept",
              label: "所属学院",
              children: assessment.mentor?.deptName ?? "—",
            },
            { key: "period", label: "学期", children: assessment.period },
            {
              key: "status",
              label: "状态",
              children: (
                <StatusTag kind="assessment" value={assessment.status} />
              ),
            },
            {
              key: "createdAt",
              label: "创建时间",
              children: formatDateTime(assessment.createdAt),
            },
            {
              key: "normalized",
              label: "权重归一化",
              children: weights.normalized ? (
                <Tag color="warning" className="m-0">
                  已按比例归一
                </Tag>
              ) : (
                "否"
              ),
            },
          ]}
        />
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="综合分"
          value={metrics.compositeScore ?? "—"}
          tone="accent"
          hint="按冻结权重加权"
        />
        <StatCard
          label="学生评价"
          value={metrics.reviewCount}
          suffix="条"
          tone="teal"
          hint={`均分 ${metrics.reviewAvg ?? "—"}`}
        />
        <StatCard
          label="指导工作量"
          value={metrics.guidanceCount}
          suffix="次"
          tone="amber"
          hint={`${formatDuration(metrics.guidanceMinutes)} · 学生 ${metrics.studentCount} 人`}
        />
        <StatCard
          label="双创成果"
          value={metrics.achievementCount}
          suffix="项"
          tone="slate"
        />
      </div>

      <Card title="指标与权重" className="mt-4">
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 4 }}
          items={[
            {
              key: "reviewWeight",
              label: "学生评价权重",
              children: `${(weights.review * 100).toFixed(0)}%`,
            },
            {
              key: "workloadWeight",
              label: "工作量权重",
              children: `${(weights.workload * 100).toFixed(0)}%`,
            },
            {
              key: "achievementWeight",
              label: "成果权重",
              children: `${(weights.achievement * 100).toFixed(0)}%`,
            },
            {
              key: "minutes",
              label: "累计指导时长",
              children: formatDuration(metrics.guidanceMinutes),
            },
          ]}
        />
        <p className="mt-3 mb-0 text-xs text-ink-muted">
          初评提交时整组指标与权重会冻结，后续新增评价或成果不会改变本次考核结果。
        </p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="二级学院初评">
          {assessment.collegeSubmittedAt ? (
            <Descriptions
              column={1}
              items={[
                {
                  key: "grade",
                  label: "初评等级",
                  children: (
                    <Tag
                      color={
                        assessment.collegeGrade === 1
                          ? "success"
                          : assessment.collegeGrade === 3
                            ? "error"
                            : "processing"
                      }
                      className="m-0"
                    >
                      {enumLabel(
                        ASSESSMENT_GRADE_LABELS,
                        assessment.collegeGrade,
                      )}
                    </Tag>
                  ),
                },
                {
                  key: "comment",
                  label: "初评意见",
                  children: assessment.collegeComment ?? "—",
                },
                {
                  key: "by",
                  label: "提交人",
                  children: assessment.collegeSubmittedBy?.name ?? "—",
                },
                {
                  key: "at",
                  label: "提交时间",
                  children: formatDateTime(assessment.collegeSubmittedAt),
                },
              ]}
            />
          ) : (
            <div className="text-sm text-ink-muted">学院尚未提交初评。</div>
          )}
        </Card>
        <Card title="创新创业学院终评">
          {assessment.finalReviewedAt ? (
            <Descriptions
              column={1}
              items={[
                {
                  key: "grade",
                  label: "终评等级",
                  children:
                    assessment.finalGrade !== null ? (
                      <Tag
                        color={
                          assessment.finalGrade === 1
                            ? "success"
                            : assessment.finalGrade === 3
                              ? "error"
                              : "processing"
                        }
                        className="m-0"
                      >
                        {enumLabel(
                          ASSESSMENT_GRADE_LABELS,
                          assessment.finalGrade,
                        )}
                      </Tag>
                    ) : (
                      "—"
                    ),
                },
                {
                  key: "comment",
                  label: "终评意见",
                  children: assessment.finalComment ?? "—",
                },
                {
                  key: "by",
                  label: "终评人",
                  children: assessment.finalReviewedBy?.name ?? "—",
                },
                {
                  key: "at",
                  label: "终评时间",
                  children: formatDateTime(assessment.finalReviewedAt),
                },
              ]}
            />
          ) : (
            <div className="text-sm text-ink-muted">
              创新创业学院尚未提交终评。
            </div>
          )}
        </Card>
      </div>

      <AppealsPanel assessmentId={assessment.id} />

      <CollegeReviewModal
        open={collegeReviewing}
        assessmentId={assessment.id}
        onClose={() => setCollegeReviewing(false)}
        onSuccess={() => void query.refetch()}
      />
      <FinalReviewModal
        open={finalReviewing}
        assessmentId={assessment.id}
        onClose={() => setFinalReviewing(false)}
        onSuccess={() => void query.refetch()}
      />
      <MentorAppealModal
        open={appealing}
        assessmentId={assessment.id}
        onClose={() => setAppealing(false)}
        onSuccess={() => void query.refetch()}
      />
    </PermissionGuard>
  );
}
