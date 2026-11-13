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
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState, NotFoundState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { EditProfileModal } from "./EditProfileModal";
import { useMentor } from "./queries";
import { useMentorWorkbench } from "../dashboard/queries";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import {
  ASSESSMENT_GRADE_LABELS,
  MENTOR_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";

function TextSection({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-ink">{title}</div>
      <p className="mt-1 mb-0 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

export function MentorDetailPage() {
  const { id } = useParams({ from: "/_app/mentors/$id" });
  const { can } = useAuth();
  const query = useMentor(id);
  const workbench = useMentorWorkbench(
    can("stats:guidance") ? id : null,
  );
  const [editing, setEditing] = useState(false);

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

  const mentor = query.data;
  if (!mentor) return null;
  const canEdit = can("mentor:admin-update");
  const summary = workbench.data;

  return (
    <PermissionGuard code="mentor:search">
      <PageHeader
        title={mentor.name}
        description={`${enumLabel(MENTOR_TYPE_LABELS, mentor.mentorType)} · ${mentor.deptName}${mentor.professionalTitle ? ` · ${mentor.professionalTitle}` : ""}`}
        back={
          <Link to="/mentors" className="inline-flex items-center gap-1 text-sm">
            <ArrowLeftOutlined /> 返回导师资源库
          </Link>
        }
        extra={
          canEdit ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
            >
              修改档案
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card title="基本信息">
          <Descriptions
            column={{ xs: 1, sm: 2 }}
            items={[
              { key: "id", label: "档案 ID", children: <span className="tabular">{mentor.id}</span> },
              { key: "name", label: "姓名", children: mentor.name },
              {
                key: "type",
                label: "导师类型",
                children: (
                  <Tag color={mentor.mentorType === "internal" ? "blue" : "geekblue"} className="m-0">
                    {enumLabel(MENTOR_TYPE_LABELS, mentor.mentorType)}
                  </Tag>
                ),
              },
              { key: "dept", label: "所属单位", children: mentor.deptName },
              {
                key: "title",
                label: "职称 / 资质",
                children: mentor.professionalTitle ?? "—",
              },
              {
                key: "status",
                label: "档案状态",
                children: (
                  <Tag color="success" className="m-0">
                    已生效
                  </Tag>
                ),
              },
              { key: "mobile", label: "联系电话", children: mentor.mobile ?? "—" },
            ]}
          />
          <div className="mt-4">
            <div className="text-sm font-medium text-ink">指导方向</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {mentor.researchFields.length ? (
                mentor.researchFields.map((field) => (
                  <Tag key={field} className="m-0">
                    {field}
                  </Tag>
                ))
              ) : (
                <span className="text-sm text-ink-muted">—</span>
              )}
            </div>
          </div>
        </Card>

        <Card title="工作台（实时）">
          {!can("stats:guidance") ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="当前账号没有工作台权限"
            />
          ) : workbench.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : workbench.isError ? (
            <QueryErrorState
              error={workbench.error}
              onRetry={() => void workbench.refetch()}
            />
          ) : summary ? (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="待确认预约"
                  value={summary.pendingAppointments}
                  tone="amber"
                />
                <StatCard
                  label="已确认待指导"
                  value={summary.confirmedAppointments}
                  tone="accent"
                />
                <StatCard
                  label="待学生确认"
                  value={summary.awaitingStudentConfirm}
                  tone="teal"
                />
                <StatCard
                  label="归档条目"
                  value={summary.archivedCount}
                  tone="slate"
                />
              </div>
              <div className="mt-4 rounded-md bg-muted p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">学生评价</span>
                  <span className="font-medium text-ink">
                    {summary.reviewSummary.count} 条
                    {summary.reviewSummary.avg !== null
                      ? ` · 均分 ${summary.reviewSummary.avg.toFixed(2)}`
                      : ""}
                  </span>
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  态度 {summary.reviewSummary.attitudeAvg?.toFixed(2) ?? "—"} ·
                  能力 {summary.reviewSummary.expertiseAvg?.toFixed(2) ?? "—"} ·
                  效果 {summary.reviewSummary.effectAvg?.toFixed(2) ?? "—"}
                </div>
              </div>
              <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">当前学期考核</span>
                  {summary.currentAssessment ? (
                    <StatusTag
                      kind="assessment"
                      value={summary.currentAssessment.status}
                    />
                  ) : (
                    <span className="text-ink-muted">暂无</span>
                  )}
                </div>
                {summary.currentAssessment ? (
                  <div className="mt-1 text-xs text-ink-muted">
                    {summary.currentAssessment.period} · 初评{" "}
                    {enumLabel(
                      ASSESSMENT_GRADE_LABELS,
                      summary.currentAssessment.collegeGrade,
                    )}{" "}
                    · 终评{" "}
                    {enumLabel(
                      ASSESSMENT_GRADE_LABELS,
                      summary.currentAssessment.finalGrade,
                    )}{" "}
                    · 综合分 {summary.currentAssessment.compositeScore ?? "—"}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="个人简介">
          <TextSection title="" value={mentor.summary} />
        </Card>
        <Card title="研究成果">
          <TextSection title="" value={mentor.researchAchievements} />
        </Card>
        <Card title="指导经历">
          <TextSection title="" value={mentor.guidanceExperience} />
        </Card>
        <Card title="校外补充信息">
          {mentor.mentorType === "internal" ? (
            <div className="text-sm text-ink-muted">
              校内导师不填写合作单位与社会任职。
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextSection title="合作单位" value={mentor.affiliateOrg} />
              <TextSection title="社会任职" value={mentor.socialRoles} />
            </div>
          )}
        </Card>
      </div>

      {canEdit ? (
        <EditProfileModal
          open={editing}
          mentor={mentor}
          onClose={() => setEditing(false)}
          onSuccess={() => {
            void query.refetch();
            void workbench.refetch();
          }}
        />
      ) : null}
    </PermissionGuard>
  );
}
