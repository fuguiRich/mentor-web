import { useState } from "react";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { Button, Empty } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EnumSelect } from "../../components/EnumSelect";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  ASSESSMENT_GRADE_LABELS,
  enumLabel,
  statusOptions,
  toOptions,
} from "../../lib/enums";
import { currentPeriod, formatDateTime, periodOptions } from "../../lib/format";
import type { AssessmentListSearch } from "../../lib/list-search";
import type { Assessment } from "../../lib/api/types";
import { CreateAssessmentModal } from "./CreateAssessmentModal";
import { useAssessments, useMentorNameMap } from "./queries";

export function AssessmentsPage() {
  const search = useSearch({ from: "/_app/assessments/" });
  const navigate = useNavigate({ from: "/assessments/" });
  const { can } = useAuth();
  const [creating, setCreating] = useState(false);

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const period = search.period ?? currentPeriod();

  const query = useAssessments({
    page,
    pageSize,
    period,
    status: search.status,
    grade: search.grade,
  });
  const mentors = useMentorNameMap();

  function updateSearch(patch: Partial<AssessmentListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  return (
    <PermissionGuard code="assessment:list">
      <PageHeader
        title="考核管理"
        description="按学期管理导师考核：学院初评、创新创业学院终评、申诉处理。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            {can("assessment:evaluate") ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreating(true)}
              >
                新建考核
              </Button>
            ) : null}
          </>
        }
      />

      <FilterBar>
        <EnumSelect
          options={periodOptions(8)}
          value={period}
          allowClear={false}
          placeholder="学期"
          style={{ minWidth: 150 }}
          onChange={(value) =>
            updateSearch({ period: value ? String(value) : undefined })
          }
        />
        <EnumSelect
          options={statusOptions("assessment")}
          value={search.status}
          placeholder="全部状态"
          style={{ minWidth: 130 }}
          onChange={(value) =>
            updateSearch({
              status: value === undefined ? undefined : Number(value),
            })
          }
        />
        <EnumSelect
          options={toOptions(ASSESSMENT_GRADE_LABELS, [1, 2, 3])}
          value={search.grade}
          placeholder="全部等级"
          style={{ minWidth: 120 }}
          onChange={(value) =>
            updateSearch({
              grade: value === undefined ? undefined : Number(value),
            })
          }
        />
        <span className="ml-auto text-xs text-ink-muted">
          共 {query.data?.total ?? 0} 条
        </span>
      </FilterBar>

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<Assessment>
          dataSource={query.data?.list ?? []}
          loading={query.isLoading}
          total={query.data?.total}
          page={page}
          pageSize={pageSize}
          onPageChange={(nextPage, nextSize) =>
            updateSearch({ page: nextPage, pageSize: nextSize })
          }
          columns={[
            {
              title: "编号",
              dataIndex: "id",
              key: "id",
              width: 90,
              render: (id: string) => <span className="tabular">#{id}</span>,
            },
            {
              title: "导师",
              dataIndex: "mentorProfileId",
              key: "mentorProfileId",
              width: 140,
              render: (mentorId: string, record) =>
                record.mentor?.name ??
                mentors.map.get(mentorId) ?? (
                  <span className="tabular">导师编号 #{mentorId}</span>
                ),
            },
            {
              title: "学期",
              dataIndex: "period",
              key: "period",
              width: 110,
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 110,
              render: (status: number) => (
                <StatusTag kind="assessment" value={status} />
              ),
            },
            {
              title: "初评",
              dataIndex: "collegeGrade",
              key: "collegeGrade",
              width: 90,
              render: (grade: number | null) =>
                grade ? enumLabel(ASSESSMENT_GRADE_LABELS, grade) : "—",
            },
            {
              title: "终评",
              dataIndex: "finalGrade",
              key: "finalGrade",
              width: 90,
              render: (grade: number | null) =>
                grade ? enumLabel(ASSESSMENT_GRADE_LABELS, grade) : "—",
            },
            {
              title: "综合分",
              dataIndex: "metrics",
              key: "compositeScore",
              width: 100,
              align: "right",
              render: (_, record) => (
                <span className="tabular">
                  {record.metrics?.compositeScore ?? "—"}
                </span>
              ),
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              key: "createdAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "操作",
              key: "actions",
              width: 80,
              fixed: "right",
              render: (_, record) => (
                <Link
                  to="/assessments/$id"
                  params={{ id: record.id }}
                  className="text-sm"
                >
                  详情
                </Link>
              ),
            },
          ]}
          emptyText={
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                search.status !== undefined || search.grade !== undefined
                  ? "没有符合筛选条件的考核"
                  : can("assessment:evaluate")
                    ? "本学期暂无考核，请先新建"
                    : "本学期暂无考核"
              }
            />
          }
        />
      )}

      <CreateAssessmentModal
        open={creating}
        onClose={() => setCreating(false)}
        onSuccess={() => void query.refetch()}
      />
    </PermissionGuard>
  );
}
