import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Select,
  Skeleton,
  Tag,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { formatDateTime } from "../../lib/format";
import type { SystemOpLogListSearch } from "../../lib/list-search";
import type { OpLog } from "../../lib/api/types";
import { useOpLog, useOpLogs } from "./queries";

function JsonBlock({ value }: { value: Record<string, unknown> | null }) {
  if (!value) return <span className="text-ink-muted">—</span>;
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-5">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function OpLogsPage() {
  const search = useSearch({ from: "/_app/system/oplogs" });
  const navigate = useNavigate({ from: "/system/oplogs" });
  const [detailId, setDetailId] = useState<string | null>(null);

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const rangeReady = Boolean(search.startTime && search.endTime);
  const query = useOpLogs({
    page,
    pageSize,
    module: search.module,
    action: search.action,
    status: search.status,
    operatorId: search.operatorId,
    targetType: search.targetType,
    targetId: search.targetId,
    startTime: rangeReady ? search.startTime : undefined,
    endTime: rangeReady ? search.endTime : undefined,
  });
  const detail = useOpLog(detailId);

  function updateSearch(patch: Partial<SystemOpLogListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  return (
    <PermissionGuard code="oplog:list">
      <PageHeader
        title="操作日志"
        description="记录管理操作、审核与异常行为；用于追溯与问题排查。"
        extra={
          <Button
            icon={<ReloadOutlined />}
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            刷新
          </Button>
        }
      />

      <FilterBar>
        <Input.Search
          key={`module-${search.module ?? ""}`}
          allowClear
          placeholder="模块"
          defaultValue={search.module}
          style={{ width: 130 }}
          onSearch={(value) =>
            updateSearch({ module: value.trim() || undefined })
          }
        />
        <Input.Search
          key={`action-${search.action ?? ""}`}
          allowClear
          placeholder="动作"
          defaultValue={search.action}
          style={{ width: 150 }}
          onSearch={(value) =>
            updateSearch({ action: value.trim() || undefined })
          }
        />
        <Input.Search
          key={`operator-${search.operatorId ?? ""}`}
          allowClear
          placeholder="操作人 ID"
          defaultValue={search.operatorId}
          style={{ width: 130 }}
          onSearch={(value) =>
            updateSearch({ operatorId: value.trim() || undefined })
          }
        />
        <Select
          allowClear
          placeholder="全部结果"
          value={search.status}
          onChange={(value) => updateSearch({ status: value })}
          options={[
            { value: 1, label: "成功" },
            { value: 0, label: "失败" },
          ]}
          style={{ minWidth: 120 }}
        />
        <Input.Search
          key={`targetType-${search.targetType ?? ""}`}
          allowClear
          placeholder="目标类型"
          defaultValue={search.targetType}
          style={{ width: 130 }}
          onSearch={(value) =>
            updateSearch({ targetType: value.trim() || undefined })
          }
        />
        <Input.Search
          key={`targetId-${search.targetId ?? ""}`}
          allowClear
          placeholder="目标 ID"
          defaultValue={search.targetId}
          style={{ width: 120 }}
          onSearch={(value) =>
            updateSearch({ targetId: value.trim() || undefined })
          }
        />
        <Input
          type="date"
          aria-label="开始日期"
          value={search.startTime ?? ""}
          onChange={(event) =>
            updateSearch({ startTime: event.target.value || undefined })
          }
          style={{ width: 145 }}
        />
        <span className="text-ink-muted">至</span>
        <Input
          type="date"
          aria-label="结束日期"
          value={search.endTime ?? ""}
          onChange={(event) =>
            updateSearch({ endTime: event.target.value || undefined })
          }
          style={{ width: 145 }}
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
        <DataTable<OpLog>
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
              title: "时间",
              dataIndex: "createdAt",
              key: "createdAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            { title: "模块", dataIndex: "module", key: "module", width: 120 },
            { title: "动作", dataIndex: "action", key: "action", width: 160 },
            {
              title: "操作人",
              key: "operator",
              width: 140,
              render: (_, record) => (
                <span>
                  {record.operatorName}
                  <span className="tabular ml-1 text-xs text-ink-muted">
                    #{record.operatorId}
                  </span>
                </span>
              ),
            },
            {
              title: "结果",
              dataIndex: "status",
              key: "status",
              width: 90,
              render: (value: number) => (
                <Tag color={value === 1 ? "success" : "error"} className="m-0">
                  {value === 1 ? "成功" : "失败"}
                </Tag>
              ),
            },
            {
              title: "错误码",
              dataIndex: "errorCode",
              key: "errorCode",
              width: 90,
              render: (value: number) =>
                value ? <span className="tabular">{value}</span> : "—",
            },
            {
              title: "耗时",
              dataIndex: "durationMs",
              key: "durationMs",
              width: 90,
              align: "right",
              render: (value: number) => `${value} ms`,
            },
            {
              title: "路径",
              dataIndex: "path",
              key: "path",
              ellipsis: true,
              render: (value: string) => (
                <span className="tabular text-xs">{value}</span>
              ),
            },
            {
              title: "操作",
              key: "actions",
              width: 80,
              fixed: "right",
              render: (_, record) => (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setDetailId(record.id)}
                >
                  详情
                </Button>
              ),
            },
          ]}
          emptyText={<Empty description="暂无操作日志" />}
        />
      )}

      <Drawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title="操作日志详情"
        size={680}
      >
        {detail.isLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : detail.isError ? (
          <QueryErrorState
            error={detail.error}
            onRetry={() => void detail.refetch()}
          />
        ) : detail.data ? (
          <>
            <Descriptions
              column={1}
              size="small"
              items={[
                { key: "id", label: "日志 ID", children: <span className="tabular">{detail.data.id}</span> },
                { key: "module", label: "模块", children: detail.data.module },
                { key: "action", label: "动作", children: detail.data.action },
                {
                  key: "operator",
                  label: "操作人",
                  children: `${detail.data.operatorName}（#${detail.data.operatorId}）`,
                },
                {
                  key: "target",
                  label: "目标对象（类型 / 编号）",
                  children:
                    detail.data.targetType || detail.data.targetId
                      ? `${detail.data.targetType ?? "—"} / ${detail.data.targetId ?? "—"}`
                      : "—",
                },
                {
                  key: "request",
                  label: "请求",
                  children: (
                    <span className="tabular text-xs">
                      {detail.data.method} {detail.data.path}
                    </span>
                  ),
                },
                {
                  key: "result",
                  label: "结果",
                  children: (
                    <Tag color={detail.data.status === 1 ? "success" : "error"}>
                      {detail.data.status === 1
                        ? "成功"
                        : `失败 ${detail.data.errorCode} ${detail.data.errorMsg ?? ""}`}
                    </Tag>
                  ),
                },
                { key: "ip", label: "IP", children: detail.data.ip },
                { key: "ua", label: "User-Agent", children: <span className="text-xs">{detail.data.userAgent}</span> },
                { key: "duration", label: "耗时", children: `${detail.data.durationMs} ms` },
                { key: "time", label: "时间", children: formatDateTime(detail.data.createdAt) },
              ]}
            />
            <div className="mt-4">
              <div className="mb-1 text-sm font-medium text-ink">修改前</div>
              <JsonBlock value={detail.data.before} />
            </div>
            <div className="mt-4">
              <div className="mb-1 text-sm font-medium text-ink">修改后</div>
              <JsonBlock value={detail.data.after} />
            </div>
          </>
        ) : null}
      </Drawer>
    </PermissionGuard>
  );
}
