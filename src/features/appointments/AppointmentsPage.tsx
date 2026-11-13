import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { Button, Empty, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EnumSelect } from "../../components/EnumSelect";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import {
  APPOINTMENT_MODE_LABELS,
  APPOINTMENT_TYPE_LABELS,
  enumLabel,
  statusOptions,
  toOptions,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type { ListSearch } from "../../lib/list-search";
import type { AppointmentListItem } from "../../lib/api/types";
import { useAppointments } from "./queries";

export function AppointmentsPage() {
  const search = useSearch({ from: "/_app/appointments/" });
  const navigate = useNavigate({ from: "/appointments/" });
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const query = useAppointments({
    page,
    pageSize,
    status: search.status,
    type: search.type,
  });

  function updateSearch(patch: Partial<ListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  return (
    <PermissionGuard code="appointment:list">
      <PageHeader
        title="预约管理"
        description="查看师生预约进展；对指导记录异议进行复核。"
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
        <EnumSelect
          options={statusOptions("appointment")}
          value={search.status}
          placeholder="全部状态"
          style={{ minWidth: 140 }}
          onChange={(value) =>
            updateSearch({
              status: value === undefined ? undefined : Number(value),
            })
          }
        />
        <EnumSelect
          options={toOptions(APPOINTMENT_TYPE_LABELS, [1, 2, 3, 4, 5])}
          value={search.type}
          placeholder="全部类型"
          style={{ minWidth: 160 }}
          onChange={(value) =>
            updateSearch({
              type: value === undefined ? undefined : Number(value),
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
        <DataTable<AppointmentListItem>
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
              title: "学生",
              key: "student",
              width: 120,
              render: (_, record) => record.student?.realName ?? "—",
            },
            {
              title: "导师",
              key: "mentor",
              width: 120,
              render: (_, record) => record.mentor?.realName ?? "—",
            },
            {
              title: "类型",
              dataIndex: "type",
              key: "type",
              width: 150,
              render: (type: number) => (
                <Tag className="m-0">
                  {enumLabel(APPOINTMENT_TYPE_LABELS, type)}
                </Tag>
              ),
            },
            {
              title: "指导主题",
              dataIndex: "topic",
              key: "topic",
              ellipsis: true,
            },
            {
              title: "期望时间",
              dataIndex: "requestedTime",
              key: "requestedTime",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "方式",
              dataIndex: "mode",
              key: "mode",
              width: 80,
              render: (mode: number) => enumLabel(APPOINTMENT_MODE_LABELS, mode),
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
              title: "操作",
              key: "actions",
              width: 80,
              fixed: "right",
              render: (_, record) => (
                <Link
                  to="/appointments/$id"
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
                search.status !== undefined || search.type !== undefined
                  ? "没有符合筛选条件的预约"
                  : "暂无预约"
              }
            />
          }
        />
      )}
    </PermissionGuard>
  );
}
