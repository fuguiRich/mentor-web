import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { Card, Empty, Skeleton, Tag } from "antd";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { DataTable } from "../../components/DataTable";
import { CompactEmpty } from "../../components/CompactEmpty";
import { QueryErrorState } from "../../components/ErrorState";
import { formatDateTime } from "../../lib/format";
import type { ListSearch } from "../../lib/list-search";
import type { Review } from "../../lib/api/types";
import { useMentorReviews, useMyMentorProfile } from "./queries";

function score(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(2);
}

export function MentorReviewsPage() {
  const search = useSearch({ from: "/_app/mentor/reviews" });
  const navigate = useNavigate({ from: "/mentor/reviews" });
  const profile = useMyMentorProfile();
  const mentorId = profile.data?.id ?? null;
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const query = useMentorReviews(mentorId, { page, pageSize });

  if (profile.isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
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
        <PageHeader title="收到评价" />
        <Card>
          <CompactEmpty
            text="尚未建立导师档案，暂时没有学生评价"
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

  const summary = query.data?.summary;

  return (
    <div>
      <PageHeader
        title="收到评价"
        description="学生对已完成指导的评价汇总；评价会作为考核的输入之一。"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="评价总数"
          value={summary?.count ?? "—"}
          suffix="条"
          tone="accent"
        />
        <StatCard
          label="综合均分"
          value={score(summary?.avg)}
          tone="teal"
        />
        <StatCard
          label="态度均分"
          value={score(summary?.attitudeAvg)}
          tone="amber"
        />
        <StatCard
          label="能力 / 效果均分"
          value={`${score(summary?.expertiseAvg)} / ${score(summary?.effectAvg)}`}
          tone="slate"
        />
      </div>

      <Card title="评价明细" className="mt-4">
        {query.isError ? (
          <QueryErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <DataTable<Review>
            dataSource={query.data?.list ?? []}
            loading={query.isLoading}
            total={query.data?.total}
            page={page}
            pageSize={pageSize}
            wrapped={false}
            onPageChange={(nextPage, nextSize) =>
              void navigate({
                search: (prev: Partial<ListSearch>) => ({
                  ...prev,
                  page: nextPage,
                  pageSize: nextSize,
                }),
              })
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
                title: "综合分",
                dataIndex: "overallScore",
                key: "overallScore",
                width: 100,
                render: (value: string) => (
                  <span className="tabular font-medium">{value}</span>
                ),
              },
              {
                title: "态度",
                dataIndex: "attitude",
                key: "attitude",
                width: 80,
                render: (value: number) => <Tag className="m-0">{value}</Tag>,
              },
              {
                title: "能力",
                dataIndex: "expertise",
                key: "expertise",
                width: 80,
                render: (value: number) => <Tag className="m-0">{value}</Tag>,
              },
              {
                title: "效果",
                dataIndex: "effect",
                key: "effect",
                width: 80,
                render: (value: number) => <Tag className="m-0">{value}</Tag>,
              },
              {
                title: "评价内容",
                dataIndex: "comment",
                key: "comment",
                ellipsis: true,
                render: (value: string | null) => value || "—",
              },
              {
                title: "时间",
                dataIndex: "createdAt",
                key: "createdAt",
                width: 170,
                render: (value: string) => formatDateTime(value),
              },
            ]}
            emptyText={<Empty description="暂无学生评价" />}
          />
        )}
      </Card>
    </div>
  );
}
