import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { App, Button, Card, Empty, Skeleton, Tabs } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { DataTable } from "../../components/DataTable";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import {
  APPOINTMENT_TYPE_LABELS,
  enumLabel,
  statusMeta,
} from "../../lib/enums";
import {
  currentPeriod,
  downloadBlob,
  formatDuration,
  formatRate,
} from "../../lib/format";
import {
  exportStats,
  statsAppointments,
  statsAssessments,
  statsGuidance,
  statsMentors,
} from "../../lib/api/endpoints/stats";
import type {
  StatsKind,
  StatsQuery,
} from "../../lib/api/types";
import type { StatsListSearch } from "../../lib/list-search";
import { DistributionBar } from "./DistributionBar";
import { StatsFilters } from "./StatsFilters";
import type { StatsFilterState } from "./StatsFilters";

const TAB_DEFS: { key: StatsKind; label: string; code: string }[] = [
  { key: "mentors", label: "导师资源库", code: "stats:mentor" },
  { key: "appointments", label: "预约情况", code: "stats:appointment" },
  { key: "guidance", label: "指导工作", code: "stats:guidance" },
  { key: "assessments", label: "考核分布", code: "stats:assessment" },
];

const PROFILE_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  pending: "审核中",
  approved: "已生效",
  rejected: "已退回",
  frozen: "已冻结",
  removed: "已移除",
};

const GRADE_COLORS = {
  excellent: "#0d9488",
  qualified: "#ca8a04",
  unqualified: "#b91c1c",
};

export function StatsPage() {
  const search = useSearch({ from: "/_app/stats" });
  const navigate = useNavigate({ from: "/stats" });
  const { can, isSuperAdmin } = useAuth();
  const { message } = App.useApp();

  const allowedTabs = TAB_DEFS.filter((tab) => can(tab.code));
  const activeTab =
    (search.tab && allowedTabs.some((tab) => tab.key === search.tab)
      ? search.tab
      : allowedTabs[0]?.key) ?? null;

  const mode: StatsFilterState["mode"] =
    search.from || search.to ? "range" : "period";
  const period = mode === "period" ? (search.period ?? currentPeriod()) : undefined;
  const rangeReady =
    mode === "period" || Boolean(search.from && search.to);

  const isSchoolWide = isSuperAdmin || can("mentor-application:review-sc");

  const filterState: StatsFilterState = {
    mode,
    period,
    from: search.from,
    to: search.to,
    deptId: search.deptId,
    mentorType: search.mentorType,
    type: search.type,
  };

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const baseParams: StatsQuery = {
    ...(mode === "period"
      ? { period }
      : { from: search.from, to: search.to }),
    mentorType: search.mentorType,
    type: search.type,
    deptId: isSchoolWide ? search.deptId : undefined,
  };

  function updateSearch(patch: Partial<StatsListSearch>) {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
        page: patch.page ?? 1,
      }),
    });
  }

  function updateFilters(patch: Partial<StatsFilterState>) {
    updateSearch({
      period: patch.period,
      from: patch.from,
      to: patch.to,
      deptId: patch.deptId,
      mentorType: patch.mentorType,
      type: patch.type,
    });
  }

  const mentorsQuery = useQuery({
    queryKey: ["stats", "mentors", baseParams],
    queryFn: () => statsMentors(baseParams),
    enabled: activeTab === "mentors" && rangeReady,
  });

  const appointmentsQuery = useQuery({
    queryKey: ["stats", "appointments", baseParams],
    queryFn: () => statsAppointments(baseParams),
    enabled: activeTab === "appointments" && rangeReady,
  });

  const guidanceQuery = useQuery({
    queryKey: ["stats", "guidance", baseParams, page, pageSize],
    queryFn: () => statsGuidance({ ...baseParams, page, pageSize }),
    enabled: activeTab === "guidance" && rangeReady,
  });

  const assessmentsQuery = useQuery({
    queryKey: ["stats", "assessments", baseParams],
    queryFn: () => statsAssessments(baseParams),
    enabled: activeTab === "assessments" && rangeReady,
  });

  const activeQuery =
    activeTab === "mentors"
      ? mentorsQuery
      : activeTab === "appointments"
        ? appointmentsQuery
        : activeTab === "guidance"
          ? guidanceQuery
          : assessmentsQuery;

  const exportMutation = useMutation({
    mutationFn: ({ kind, params }: { kind: StatsKind; params: StatsQuery }) =>
      exportStats(kind, params),
    onSuccess: ({ blob, filename }, variables) => {
      downloadBlob(blob, filename ?? `${variables.kind}-export.csv`);
      message.success("导出已开始下载");
    },
    onError: (error) => {
      message.error(
        error instanceof ApiError ? error.message : "导出失败，请稍后重试",
      );
    },
  });

  function handleExport() {
    if (!activeTab) return;
    exportMutation.mutate({ kind: activeTab, params: baseParams });
  }

  if (!allowedTabs.length) {
    return (
      <PermissionGuard code="stats:mentor">
        <div />
      </PermissionGuard>
    );
  }

  const tabItems = allowedTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    children: (
      <div className="pt-2">
        {!rangeReady ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请选择完整的起止日期"
            className="my-10!"
          />
        ) : activeQuery.isError ? (
          <QueryErrorState
            error={activeQuery.error}
            onRetry={() => void activeQuery.refetch()}
          />
        ) : activeQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <>
            {tab.key === "mentors" && mentorsQuery.data ? (
              <MentorStatsView data={mentorsQuery.data} />
            ) : null}
            {tab.key === "appointments" && appointmentsQuery.data ? (
              <AppointmentStatsView data={appointmentsQuery.data} />
            ) : null}
            {tab.key === "guidance" && guidanceQuery.data ? (
              <GuidanceStatsView
                data={guidanceQuery.data}
                page={page}
                pageSize={pageSize}
                onPageChange={(nextPage, nextSize) =>
                  updateSearch({ page: nextPage, pageSize: nextSize })
                }
              />
            ) : null}
            {tab.key === "assessments" && assessmentsQuery.data ? (
              <AssessmentStatsView data={assessmentsQuery.data} />
            ) : null}
          </>
        )}
      </div>
    ),
  }));

  return (
    <PermissionGuard code={allowedTabs[0].code}>
      <PageHeader
        title="统计分析"
        description="按学期或日期区间查看导师、预约、指导与考核数据，并导出 CSV。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={activeQuery.isFetching}
              onClick={() => void activeQuery.refetch()}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={exportMutation.isPending}
              disabled={!rangeReady}
              onClick={handleExport}
            >
              导出当前表
            </Button>
          </>
        }
      />

      <StatsFilters
        state={filterState}
        onChange={updateFilters}
        showDept={isSchoolWide}
      />

      <Tabs
        activeKey={activeTab ?? undefined}
        onChange={(key) =>
          updateSearch({ tab: key as StatsListSearch["tab"] })
        }
        items={tabItems}
      />
    </PermissionGuard>
  );
}

// ---------- 各 Tab 视图 ----------

function MentorStatsView({
  data,
}: {
  data: Awaited<ReturnType<typeof statsMentors>>;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="导师总数" value={data.total} suffix="人" tone="accent" />
        <StatCard label="校内导师" value={data.internal} suffix="人" tone="teal" />
        <StatCard label="校外导师" value={data.external} suffix="人" tone="amber" />
        <StatCard label="活跃导师" value={data.active} suffix="人" tone="teal" />
        <StatCard label="非活跃导师" value={data.inactive} suffix="人" tone="slate" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="档案状态分布">
          <DistributionBar
            total={data.total}
            items={Object.entries(data.byStatus).map(([key, value]) => ({
              label: PROFILE_STATUS_LABELS[key] ?? key,
              value,
            }))}
          />
        </Card>
        <Card title="研究方向分布">
          <DistributionBar
            items={[...data.byResearchField]
              .sort((a, b) => b.count - a.count)
              .slice(0, 12)
              .map((item) => ({ label: item.field, value: item.count }))}
          />
        </Card>
      </div>
    </>
  );
}

function AppointmentStatsView({
  data,
}: {
  data: Awaited<ReturnType<typeof statsAppointments>>;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="预约总数" value={data.total} suffix="条" tone="accent" />
        <StatCard
          label="预约成功率"
          value={formatRate(data.acceptanceRate)}
          tone="teal"
          hint="已确认 / 已处理"
        />
        <StatCard
          label="指导完成率"
          value={formatRate(data.completionRate)}
          tone="amber"
          hint="已完成 / 已确认"
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card title="预约状态分布">
          <DistributionBar
            total={data.total}
            items={data.byStatus.map((item) => ({
              label: statusMeta("appointment", item.status).label,
              value: item.count,
            }))}
          />
        </Card>
        <Card title="多次预约失败的师生">
          <DataTable
            dataSource={data.failedPairs}
            pagination={false}
            wrapped={false}
            columns={[
              { title: "学生", dataIndex: "studentName", key: "studentName" },
              { title: "导师", dataIndex: "mentorName", key: "mentorName" },
              {
                title: "失败次数",
                dataIndex: "failedCount",
                key: "failedCount",
                align: "right",
                width: 100,
              },
            ]}
            emptyText={<Empty description="暂无多次失败记录" />}
          />
        </Card>
      </div>
    </>
  );
}

function GuidanceStatsView({
  data,
  page,
  pageSize,
  onPageChange,
}: {
  data: Awaited<ReturnType<typeof statsGuidance>>;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="指导次数" value={data.guidanceCount} suffix="次" tone="accent" />
        <StatCard
          label="累计指导时长"
          value={formatDuration(data.guidanceMinutes)}
          tone="teal"
        />
        <StatCard label="指导学生数" value={data.studentCount} suffix="人" tone="amber" />
        <StatCard label="关联成果" value={data.achievementCount} suffix="项" tone="slate" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
        <Card title="按预约类型分布">
          <DistributionBar
            items={data.byType.map((item) => ({
              label: enumLabel(APPOINTMENT_TYPE_LABELS, item.type),
              value: item.count,
            }))}
          />
        </Card>
        <Card title="导师指导明细">
          <DataTable
            dataSource={data.byMentor}
            total={data.byMentorTotal}
            page={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            wrapped={false}
            columns={[
              {
                title: "导师",
                dataIndex: "mentorName",
                key: "mentorName",
              },
              {
                title: "指导次数",
                dataIndex: "guidanceCount",
                key: "guidanceCount",
                align: "right",
                width: 100,
              },
              {
                title: "累计时长",
                dataIndex: "guidanceMinutes",
                key: "guidanceMinutes",
                width: 130,
                render: (value: number) => formatDuration(value),
              },
              {
                title: "学生数",
                dataIndex: "studentCount",
                key: "studentCount",
                align: "right",
                width: 90,
              },
              {
                title: "成果数",
                dataIndex: "achievementCount",
                key: "achievementCount",
                align: "right",
                width: 90,
              },
            ]}
            emptyText={<Empty description="暂无指导记录" />}
          />
        </Card>
      </div>
    </>
  );
}

function AssessmentStatsView({
  data,
}: {
  data: Awaited<ReturnType<typeof statsAssessments>>;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="考核总数" value={data.total} suffix="项" tone="accent" />
        <StatCard label="优秀" value={data.byGrade.excellent} suffix="项" tone="teal" />
        <StatCard label="合格" value={data.byGrade.qualified} suffix="项" tone="amber" />
        <StatCard label="不合格" value={data.byGrade.unqualified} suffix="项" tone="danger" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="考核等级分布">
          <DistributionBar
            total={data.total}
            items={[
              {
                label: "优秀",
                value: data.byGrade.excellent,
                color: GRADE_COLORS.excellent,
              },
              {
                label: "合格",
                value: data.byGrade.qualified,
                color: GRADE_COLORS.qualified,
              },
              {
                label: "不合格",
                value: data.byGrade.unqualified,
                color: GRADE_COLORS.unqualified,
              },
            ]}
          />
        </Card>
        <Card title="按导师类型">
          <DistributionBar
            items={data.byMentorType.map((item) => ({
              label: item.mentorType === "internal" ? "校内导师" : "校外导师",
              value: item.total,
            }))}
          />
        </Card>
        <Card title="按部门">
          <DistributionBar
            items={[...data.byDept]
              .sort((a, b) => b.total - a.total)
              .map((item) => ({ label: item.deptName, value: item.total }))}
          />
        </Card>
        <Card title="按研究方向">
          <DistributionBar
            items={[...data.byResearchField]
              .sort((a, b) => b.total - a.total)
              .slice(0, 12)
              .map((item) => ({ label: item.field, value: item.total }))}
          />
        </Card>
      </div>
    </>
  );
}
