import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { Button, Empty, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EnumSelect } from "../../components/EnumSelect";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import {
  APPLICATION_TYPE_LABELS,
  enumLabel,
  statusOptions,
  toOptions,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type { ListSearch } from "../../lib/list-search";
import type { MentorApplication } from "../../lib/api/types";
import { useMyApplications } from "./queries";

export function MentorApplicationsPage() {
  const search = useSearch({ from: "/_app/mentor/applications/" });
  const navigate = useNavigate({ from: "/mentor/applications/" });
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const query = useMyApplications({
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
    <div>
      <PageHeader
        title="我的申请"
        description="查看入驻申请与信息修改申请的审核进度；审核中 / 已退回的申请可上传佐证材料。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            <Link to="/mentor/profile">
              <Button type="primary">我的档案</Button>
            </Link>
          </>
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
              title: "编号",
              dataIndex: "id",
              key: "id",
              width: 100,
              render: (id: string) => <span className="tabular">#{id}</span>,
            },
            {
              title: "类型",
              dataIndex: "type",
              key: "type",
              width: 130,
              render: (type: number) => (
                <Tag className="m-0">
                  {enumLabel(APPLICATION_TYPE_LABELS, type)}
                </Tag>
              ),
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 170,
              render: (status: number) => (
                <StatusTag kind="application" value={status} />
              ),
            },
            {
              title: "提交时间",
              dataIndex: "submittedAt",
              key: "submittedAt",
              width: 180,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "操作",
              key: "actions",
              width: 90,
              fixed: "right",
              render: (_, record) => (
                <Link
                  to="/mentor/applications/$id"
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
                  : "暂无申请，请先在档案页提交"
              }
            />
          }
        />
      )}
    </div>
  );
}
