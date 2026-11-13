import { useState } from "react";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { App, Button, Card, Empty, Select, Tag } from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { CompactEmpty } from "../../components/CompactEmpty";
import { FilePreview } from "../../components/FilePreview";
import { QueryErrorState } from "../../components/ErrorState";
import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_TYPE_LABELS,
  enumLabel,
  toOptions,
} from "../../lib/enums";
import { formatDate } from "../../lib/format";
import { downloadWithAuth } from "../../lib/download";
import {
  downloadAchievementProof,
  previewAchievementProof,
} from "../../lib/api/endpoints/mentor";
import type { MentorAchievementListSearch } from "../../lib/list-search";
import type { Achievement } from "../../lib/api/types";
import { MentorAchievementFormModal } from "./MentorAchievementFormModal";
import {
  useAchievements,
  useDeleteAchievement,
  useMyMentorProfile,
} from "./queries";

export function MentorAchievementsPage() {
  const { message, modal } = App.useApp();
  const search = useSearch({ from: "/_app/mentor/achievements" });
  const navigate = useNavigate({ from: "/mentor/achievements" });
  const profile = useMyMentorProfile();
  const mentorId = profile.data?.id ?? null;
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const year = currentYear - index;
    return { value: year, label: `${year} 年` };
  });

  const query = useAchievements(mentorId, {
    page,
    pageSize,
    type: search.type,
    level: search.level,
    year: search.year,
  });
  const deleteMutation = useDeleteAchievement(mentorId ?? "");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [preview, setPreview] = useState<Achievement | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  function updateSearch(patch: Partial<MentorAchievementListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  if (profile.isLoading) {
    return <Card loading />;
  }

  if (profile.isError) {
    return (
      <QueryErrorState
        error={profile.error}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  if (!mentorId) {
    return (
      <div>
        <PageHeader title="双创成果" />
        <Card>
          <CompactEmpty
            text="尚未建立导师档案，暂时不能登记成果"
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

  function confirmDelete(achievement: Achievement) {
    modal.confirm({
      title: "删除双创成果",
      content: `确认删除「${achievement.title}」？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(achievement.id);
          message.success("成果已删除");
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : "删除失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  async function handleDownload(achievement: Achievement) {
    if (!mentorId) return;
    setDownloading(achievement.id);
    try {
      await downloadWithAuth(
        () => downloadAchievementProof(mentorId, achievement.id),
        `成果佐证-${achievement.title}`,
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "下载失败，请稍后重试",
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="双创成果"
        description="登记竞赛获奖、项目立项等成果；成果会计入指导工作量与考核。"
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
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              登记成果
            </Button>
          </>
        }
      />

      <FilterBar>
        <Select
          allowClear
          placeholder="全部类型"
          value={search.type}
          onChange={(value) => updateSearch({ type: value })}
          options={toOptions(ACHIEVEMENT_TYPE_LABELS, [1, 2, 3])}
          style={{ minWidth: 130 }}
        />
        <Select
          allowClear
          placeholder="全部级别"
          value={search.level}
          onChange={(value) => updateSearch({ level: value })}
          options={toOptions(ACHIEVEMENT_LEVEL_LABELS, [1, 2, 3, 4, 5])}
          style={{ minWidth: 130 }}
        />
        <Select
          allowClear
          placeholder="全部年份"
          value={search.year}
          onChange={(value) => updateSearch({ year: value })}
          options={yearOptions}
          style={{ minWidth: 120 }}
        />
        <span className="ml-auto text-xs text-ink-muted">
          共 {query.data?.total ?? 0} 项
        </span>
      </FilterBar>

      <Card>
        {query.isError ? (
          <QueryErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <DataTable<Achievement>
            dataSource={query.data?.list ?? []}
            loading={query.isLoading}
            total={query.data?.total}
            page={page}
            pageSize={pageSize}
            wrapped={false}
            onPageChange={(nextPage, nextSize) =>
              updateSearch({ page: nextPage, pageSize: nextSize })
            }
            columns={[
              {
                title: "成果名称",
                dataIndex: "title",
                key: "title",
                ellipsis: true,
              },
              {
                title: "类型",
                dataIndex: "type",
                key: "type",
                width: 110,
                render: (type: number) => (
                  <Tag className="m-0">
                    {enumLabel(ACHIEVEMENT_TYPE_LABELS, type)}
                  </Tag>
                ),
              },
              {
                title: "级别",
                dataIndex: "level",
                key: "level",
                width: 90,
                render: (level: number) =>
                  enumLabel(ACHIEVEMENT_LEVEL_LABELS, level),
              },
              {
                title: "获奖 / 立项日期",
                dataIndex: "awardedAt",
                key: "awardedAt",
                width: 130,
                render: (value: string) => formatDate(value),
              },
              {
                title: "说明",
                dataIndex: "description",
                key: "description",
                ellipsis: true,
                render: (value: string | null) => value || "—",
              },
              {
                title: "佐证",
                dataIndex: "proofFileId",
                key: "proofFileId",
                width: 90,
                render: (value: string | null) =>
                  value ? <Tag color="success">已上传</Tag> : "—",
              },
              {
                title: "操作",
                key: "actions",
                width: 250,
                render: (_, record) => (
                  <div className="table-actions">
                    {record.proofFileId ? (
                      <>
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => setPreview(record)}
                        >
                          佐证
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          loading={downloading === record.id}
                          onClick={() => void handleDownload(record)}
                        >
                          下载
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setEditing(record);
                        setFormOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => confirmDelete(record)}
                    >
                      删除
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyText={
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无成果，点击右上角登记"
              />
            }
          />
        )}
      </Card>

      <MentorAchievementFormModal
        open={formOpen}
        mentorId={mentorId}
        achievement={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={() => void query.refetch()}
      />

      <FilePreview
        open={Boolean(preview)}
        title={preview ? `成果佐证-${preview.title}` : "成果佐证"}
        loader={
          preview
            ? () => previewAchievementProof(mentorId, preview.id)
            : null
        }
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
