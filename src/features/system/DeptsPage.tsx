import { Button, Empty } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { useDepts } from "../../lib/hooks/useDepts";
import { formatDateTime } from "../../lib/format";
import type { Dept } from "../../lib/api/types";

export function DeptsPage() {
  const query = useDepts();

  return (
    <PermissionGuard code="dept:list">
      <PageHeader
        title="部门"
        description="组织架构由外部系统定期同步，本页只读。数据权限以部门树为准。"
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

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<Dept>
          dataSource={query.data ?? []}
          loading={query.isLoading}
          pagination={false}
          expandable={{ defaultExpandAllRows: true }}
          columns={[
            { title: "部门名称", dataIndex: "name", key: "name", width: 260 },
            {
              title: "部门 ID",
              dataIndex: "id",
              key: "id",
              width: 110,
              render: (value: string) => (
                <span className="tabular text-xs">{value}</span>
              ),
            },
            {
              title: "排序",
              dataIndex: "sortOrder",
              key: "sortOrder",
              width: 80,
              align: "right",
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 90,
              render: (value: number) => (
                <StatusTag kind="config" value={value} />
              ),
            },
            {
              title: "备注",
              dataIndex: "remark",
              key: "remark",
              ellipsis: true,
              render: (value: string | null) => value || "—",
            },
            {
              title: "更新时间",
              dataIndex: "updatedAt",
              key: "updatedAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
          ]}
          emptyText={<Empty description="暂无部门数据" />}
        />
      )}
    </PermissionGuard>
  );
}
