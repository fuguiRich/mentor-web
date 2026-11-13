import { useState } from "react";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { App, Button, Empty, Input, Select } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { ApiError } from "../../lib/api/client";
import {
  APPOINTMENT_MODE_LABELS,
  APPOINTMENT_TYPE_LABELS,
  enumLabel,
  toOptions,
} from "../../lib/enums";
import {
  downloadBlob,
  formatDateTime,
  formatDuration,
} from "../../lib/format";
import type { MentorRecordListSearch } from "../../lib/list-search";
import type { MentorRecord } from "../../lib/api/types";
import { exportMentorRecords } from "../../lib/api/endpoints/mentor";
import { useMentorRecords } from "./queries";

export function MentorRecordsPage() {
  const { message } = App.useApp();
  const search = useSearch({ from: "/_app/mentor/records" });
  const navigate = useNavigate({ from: "/mentor/records" });
  const [exporting, setExporting] = useState(false);

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const from = search.from
    ? new Date(`${search.from}T00:00:00`).toISOString()
    : undefined;
  const to = search.to
    ? new Date(`${search.to}T23:59:59.999`).toISOString()
    : undefined;

  const query = useMentorRecords({
    page,
    pageSize,
    from,
    to,
    type: search.type,
  });

  function updateSearch(patch: Partial<MentorRecordListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportMentorRecords({
        from,
        to,
        type: search.type,
      });
      downloadBlob(blob, filename ?? "mentor-records.csv");
      message.success("台账导出已开始下载");
    } catch (error) {
      if (error instanceof ApiError && error.code === 37004) {
        message.error("记录过多，请缩小时间范围后再导出");
      } else {
        message.error(
          error instanceof Error ? error.message : "导出失败，请稍后重试",
        );
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="指导记录"
        description="按实际指导时间查看本人全部指导记录；可直接导出逐条台账 CSV。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={() => void handleExport()}
            >
              导出台账
            </Button>
          </>
        }
      />

      <FilterBar>
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
              from: undefined,
              to: undefined,
              type: undefined,
            })
          }
        >
          重置筛选
        </Button>
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
        <DataTable<MentorRecord>
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
              title: "预约编号",
              dataIndex: "appointmentId",
              key: "appointmentId",
              width: 100,
              render: (id: string) => (
                <Link
                  to="/mentor/appointments/$id"
                  params={{ id }}
                  className="tabular text-sm"
                >
                  #{id}
                </Link>
              ),
            },
            {
              title: "学生",
              key: "student",
              width: 150,
              render: (_, record) => (
                <span>
                  {record.studentName}
                  <span className="tabular ml-1 text-xs text-ink-muted">
                    {record.studentLogin}
                  </span>
                </span>
              ),
            },
            {
              title: "类型",
              dataIndex: "type",
              key: "type",
              width: 150,
              render: (type: number) =>
                enumLabel(APPOINTMENT_TYPE_LABELS, type),
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 130,
              render: (status: number) => (
                <StatusTag kind="appointment" value={status} />
              ),
            },
            {
              title: "实际指导时间",
              dataIndex: "actualTime",
              key: "actualTime",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "方式",
              dataIndex: "mode",
              key: "mode",
              width: 80,
              render: (mode: number) =>
                enumLabel(APPOINTMENT_MODE_LABELS, mode),
            },
            {
              title: "时长",
              dataIndex: "durationMinutes",
              key: "durationMinutes",
              width: 120,
              render: (value: number) =>
                value > 0 ? formatDuration(value) : "—",
            },
            {
              title: "核心指导内容",
              dataIndex: "coreContent",
              key: "coreContent",
              ellipsis: true,
            },
            {
              title: "后续建议",
              dataIndex: "followUp",
              key: "followUp",
              ellipsis: true,
              render: (value: string | null) => value || "—",
            },
          ]}
          emptyText={
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                search.from || search.to || search.type
                  ? "没有符合筛选条件的指导记录"
                  : "暂无指导记录"
              }
            />
          }
        />
      )}
    </div>
  );
}
