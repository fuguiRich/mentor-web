import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { App, Button, Card, Empty, Input, Segmented, Select, Skeleton } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { DataTable } from "../../components/DataTable";
import { CompactEmpty } from "../../components/CompactEmpty";
import { QueryErrorState } from "../../components/ErrorState";
import { DistributionBar } from "../stats/DistributionBar";
import {
  APPOINTMENT_TYPE_LABELS,
  enumLabel,
  toOptions,
} from "../../lib/enums";
import {
  currentPeriod,
  downloadBlob,
  formatDuration,
  periodOptions,
} from "../../lib/format";
import {
  exportStats,
  statsGuidance,
} from "../../lib/api/endpoints/stats";
import type { StatsQuery } from "../../lib/api/types";
import type { StatsListSearch } from "../../lib/list-search";
import { useMyMentorProfile } from "./queries";

export function MentorStatsPage() {
  const { message } = App.useApp();
  const search = useSearch({ from: "/_app/mentor/stats" });
  const navigate = useNavigate({ from: "/mentor/stats" });
  const profile = useMyMentorProfile();

  const mode = search.from || search.to ? "range" : "period";
  const period =
    mode === "period" ? (search.period ?? currentPeriod()) : undefined;
  const rangeReady = mode === "period" || Boolean(search.from && search.to);
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const params: StatsQuery = {
    ...(mode === "period"
      ? { period }
      : { from: search.from, to: search.to }),
    type: search.type,
    page,
    pageSize,
  };

  const query = useQuery({
    queryKey: ["mentor", "stats", "guidance", params],
    queryFn: () => statsGuidance(params),
    enabled: Boolean(profile.data) && rangeReady,
  });

  function updateSearch(patch: Partial<StatsListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  async function handleExport() {
    try {
      const { blob, filename } = await exportStats("guidance", params);
      downloadBlob(blob, filename ?? "mentor-guidance.csv");
      message.success("导出已开始下载");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "导出失败，请稍后重试",
      );
    }
  }

  if (profile.isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (profile.isError) {
    return (
      <QueryErrorState
        error={profile.error}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  if (!profile.data) {
    return (
      <div>
        <PageHeader title="指导统计" />
        <Card>
          <CompactEmpty
            text="尚未建立导师档案，暂无指导数据"
            action={
              <Link to="/mentor/profile" className="text-sm">
                去建档
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="指导统计"
        description="按学期或日期区间查看指导次数、时长、学生数与成果数，并导出统计表。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            <Link to="/mentor/records">
              <Button>指导记录台账</Button>
            </Link>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              disabled={!rangeReady}
              onClick={() => void handleExport()}
            >
              导出统计表
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={(value) => {
            if (value === "period") {
              updateSearch({
                period: search.period ?? currentPeriod(),
                from: undefined,
                to: undefined,
              });
            } else {
              updateSearch({ period: undefined });
            }
          }}
          options={[
            { label: "按学期", value: "period" },
            { label: "按日期", value: "range" },
          ]}
        />
        {mode === "period" ? (
          <Select
            value={period}
            onChange={(value) => updateSearch({ period: value })}
            options={periodOptions(8)}
            style={{ minWidth: 150 }}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              aria-label="起始日期"
              value={search.from ?? ""}
              onChange={(event) =>
                updateSearch({ from: event.target.value || undefined })
              }
              style={{ width: 150 }}
            />
            <span className="text-ink-muted">至</span>
            <Input
              type="date"
              aria-label="结束日期"
              value={search.to ?? ""}
              onChange={(event) =>
                updateSearch({ to: event.target.value || undefined })
              }
              style={{ width: 150 }}
            />
          </div>
        )}
        <Select
          allowClear
          placeholder="全部预约类型"
          value={search.type}
          onChange={(value) => updateSearch({ type: value })}
          options={toOptions(APPOINTMENT_TYPE_LABELS, [1, 2, 3, 4, 5])}
          style={{ minWidth: 160 }}
        />
        <Button
          type="link"
          onClick={() =>
            updateSearch({
              period: currentPeriod(),
              from: undefined,
              to: undefined,
              type: undefined,
            })
          }
        >
          重置筛选
        </Button>
      </div>

      {!rangeReady ? (
        <Card>
          <CompactEmpty text="请选择完整的起止日期" />
        </Card>
      ) : query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : query.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="指导次数"
              value={query.data.guidanceCount}
              suffix="次"
              tone="accent"
            />
            <StatCard
              label="累计指导时长"
              value={formatDuration(query.data.guidanceMinutes)}
              tone="teal"
            />
            <StatCard
              label="指导学生数"
              value={query.data.studentCount}
              suffix="人"
              tone="amber"
            />
            <StatCard
              label="关联成果"
              value={query.data.achievementCount}
              suffix="项"
              tone="slate"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
            <Card title="按预约类型分布">
              <DistributionBar
                items={query.data.byType.map((item) => ({
                  label: enumLabel(APPOINTMENT_TYPE_LABELS, item.type),
                  value: item.count,
                }))}
                emptyText="暂无指导记录"
              />
            </Card>
            <Card title="我的指导明细">
              <DataTable
                dataSource={query.data.byMentor}
                total={query.data.byMentorTotal}
                page={page}
                pageSize={pageSize}
                wrapped={false}
                onPageChange={(nextPage, nextSize) =>
                  updateSearch({ page: nextPage, pageSize: nextSize })
                }
                columns={[
                  { title: "导师", dataIndex: "mentorName", key: "mentorName" },
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
      ) : null}
    </div>
  );
}
