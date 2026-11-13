import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { Button, Empty, Input, Select, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { EnumSelect } from "../../components/EnumSelect";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { useDepts } from "../../lib/hooks/useDepts";
import { flattenDepts } from "../../lib/tree";
import { MENTOR_TYPE_LABELS, enumLabel } from "../../lib/enums";
import type { MentorListSearch } from "../../lib/list-search";
import type { MentorSearchItem } from "../../lib/api/types";
import { useMentors } from "./queries";

export function MentorsPage() {
  const search = useSearch({ from: "/_app/mentors/" });
  const navigate = useNavigate({ from: "/mentors/" });
  const depts = useDepts();
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const query = useMentors({
    page,
    pageSize,
    keyword: search.keyword,
    name: search.name,
    mentorType: search.mentorType,
    researchField: search.researchField,
    professionalTitle: search.professionalTitle,
    deptId: search.deptId,
  });

  function updateSearch(patch: Partial<MentorListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  const hasFilters = Boolean(
    search.keyword ||
      search.name ||
      search.mentorType ||
      search.researchField ||
      search.professionalTitle ||
      search.deptId,
  );

  return (
    <PermissionGuard code="mentor:search">
      <PageHeader
        title="导师资源库"
        description="查看已生效导师的专业档案、研究方向与指导工作台。"
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
          key={`keyword-${search.keyword ?? ""}`}
          allowClear
          placeholder="姓名 / 关键词"
          defaultValue={search.keyword}
          style={{ width: 200 }}
          onSearch={(value) =>
            updateSearch({ keyword: value.trim() || undefined })
          }
        />
        <EnumSelect
          options={[
            { value: "internal", label: "校内导师" },
            { value: "external", label: "校外导师" },
          ]}
          value={search.mentorType}
          placeholder="全部类型"
          style={{ minWidth: 120 }}
          onChange={(value) =>
            updateSearch({
              mentorType:
                value === "internal" || value === "external"
                  ? value
                  : undefined,
            })
          }
        />
        <Input.Search
          key={`researchField-${search.researchField ?? ""}`}
          allowClear
          placeholder="指导方向"
          defaultValue={search.researchField}
          style={{ width: 150 }}
          onSearch={(value) =>
            updateSearch({ researchField: value.trim() || undefined })
          }
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="所属学院"
          style={{ minWidth: 160 }}
          value={search.deptId}
          options={flattenDepts(depts.data ?? [])}
          loading={depts.isLoading}
          onChange={(value) => updateSearch({ deptId: value || undefined })}
        />
        {hasFilters ? (
          <Button
            type="link"
            onClick={() =>
              void navigate({
                search: { page: 1, pageSize },
              })
            }
          >
            清除筛选
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-ink-muted">
          共 {query.data?.total ?? 0} 位导师
        </span>
      </FilterBar>

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<MentorSearchItem>
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
              title: "姓名",
              dataIndex: "name",
              key: "name",
              width: 110,
              render: (name: string, record) => (
                <Link
                  to="/mentors/$id"
                  params={{ id: record.id }}
                  className="font-medium"
                >
                  {name}
                </Link>
              ),
            },
            {
              title: "类型",
              dataIndex: "mentorType",
              key: "mentorType",
              width: 90,
              render: (type: string) => (
                <Tag
                  color={type === "internal" ? "blue" : "geekblue"}
                  className="m-0"
                >
                  {enumLabel(MENTOR_TYPE_LABELS, type)}
                </Tag>
              ),
            },
            {
              title: "所属单位",
              dataIndex: "deptName",
              key: "deptName",
              width: 140,
            },
            {
              title: "职称 / 资质",
              dataIndex: "professionalTitle",
              key: "professionalTitle",
              width: 130,
              render: (value: string | null) => value ?? "—",
            },
            {
              title: "指导方向",
              dataIndex: "researchFields",
              key: "researchFields",
              width: 220,
              render: (fields: string[]) => (
                <div className="flex flex-wrap gap-1">
                  {fields.length ? (
                    fields.map((field) => (
                      <Tag key={field} className="m-0">
                        {field}
                      </Tag>
                    ))
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </div>
              ),
            },
            {
              title: "个人简介",
              dataIndex: "summary",
              key: "summary",
              ellipsis: true,
              render: (value: string | null) => value || "—",
            },
            {
              title: "操作",
              key: "actions",
              width: 80,
              fixed: "right",
              render: (_, record) => (
                <Link
                  to="/mentors/$id"
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
                hasFilters ? "没有符合条件的导师" : "暂无已生效导师"
              }
            />
          }
        />
      )}
    </PermissionGuard>
  );
}
