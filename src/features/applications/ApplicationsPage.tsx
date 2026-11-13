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
  APPLICATION_TYPE_LABELS,
  enumLabel,
  statusOptions,
  toOptions,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type { ListSearch } from "../../lib/list-search";
import type { MentorApplication } from "../../lib/api/types";
import { useApplications } from "./queries";

export function ApplicationsPage() {
  const search = useSearch({ from: "/_app/applications/" });
  const navigate = useNavigate({ from: "/applications/" });
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const query = useApplications({
    page,
    pageSize,
    status: search.status,
    type: search.type,
  });

  function updateSearch(patch: Partial<ListSearch>) {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
        page: patch.page ?? 1,
      }),
    });
  }

  return (
    <PermissionGuard code="mentor-application:list">
      <PageHeader
        title="入驻审核"
        description="审核导师入驻申请与信息修改申请；两级审核都需填写意见。"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void query.refetch()}
            loading={query.isFetching}
          >
            刷新
          </Button>
        }
      />

      <FilterBar>
        <EnumSelect
          options={statusOptions("application")}
          value={search.status}
          placeholder="全部状态"
          onChange={(value) =>
            updateSearch({
              status: value === undefined ? undefined : Number(value),
            })
          }
        />
        <EnumSelect
          options={toOptions(APPLICATION_TYPE_LABELS, [1, 2])}
          value={search.type}
          placeholder="全部类型"
          style={{ minWidth: 130 }}
          onChange={(value) =>
            updateSearch({
              type: value === undefined ? undefined : Number(value),
            })
          }
        />
        <span className="text-xs text-ink-muted">
          共 {query.data?.total ?? 0} 条
        </span>
      </FilterBar>

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<MentorApplication>
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
              title: "申请编号",
              dataIndex: "id",
              key: "id",
              width: 110,
              render: (id: string) => <span className="tabular">#{id}</span>,
            },
            {
              title: "类型",
              dataIndex: "type",
              key: "type",
              width: 110,
              render: (type: number) => (
                <Tag className="m-0">
                  {enumLabel(APPLICATION_TYPE_LABELS, type)}
                </Tag>
              ),
            },
            {
              title: "申请人编号",
              dataIndex: "applicantId",
              key: "applicantId",
              width: 110,
              render: (id: string) => (
                <span className="tabular">#{id}</span>
              ),
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 150,
              render: (status: number) => (
                <StatusTag kind="application" value={status} />
              ),
            },
            {
              title: "提交时间",
              dataIndex: "submittedAt",
              key: "submittedAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "操作",
              key: "actions",
              width: 90,
              fixed: "right",
              render: (_, record) => (
                <Link
                  to="/applications/$id"
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
                  ? "没有符合筛选条件的申请"
                  : "暂无入驻申请"
              }
            />
          }
        />
      )}
    </PermissionGuard>
  );
}
