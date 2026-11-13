import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { App, Button, Empty, Select, Tag } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { FilePreview } from "../../components/FilePreview";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_TYPE_LABELS,
  enumLabel,
  toOptions,
} from "../../lib/enums";
import { formatDate } from "../../lib/format";
import { downloadWithAuth } from "../../lib/download";
import {
  downloadStudentAchievementProof,
  previewStudentAchievementProof,
} from "../../lib/api/endpoints/studentAchievements";
import type { StudentAchievementListSearch } from "../../lib/list-search";
import type { StudentAchievement } from "../../lib/api/types";
import { CreateStudentAchievementModal } from "./CreateStudentAchievementModal";
import { LinkMentorModal } from "./LinkMentorModal";
import {
  useDeleteStudentAchievement,
  useMentorNameMap,
  useMentorOptions,
  useStudentAchievements,
  useStudentOptions,
} from "./queries";

export function StudentAchievementsPage() {
  const search = useSearch({ from: "/_app/student-achievements" });
  const navigate = useNavigate({ from: "/student-achievements" });
  const { can } = useAuth();
  const { message, modal } = App.useApp();
  const deleteMutation = useDeleteStudentAchievement();
  const mentorNames = useMentorNameMap();
  const [studentKeyword, setStudentKeyword] = useState("");
  const [studentDebounced, setStudentDebounced] = useState("");
  const canBrowseStudents =
    can("student-achievement:manage") || can("stats:mentor");
  const studentOptions = useStudentOptions(
    studentDebounced || undefined,
    canBrowseStudents,
  );
  const mentorOptions = useMentorOptions();

  useEffect(() => {
    const timer = setTimeout(
      () => setStudentDebounced(studentKeyword.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [studentKeyword]);

  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState<StudentAchievement | null>(null);
  const [preview, setPreview] = useState<StudentAchievement | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const canManage = can("student-achievement:manage");
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const year = currentYear - index;
    return { value: year, label: `${year} 年` };
  });

  const query = useStudentAchievements({
    page,
    pageSize,
    studentPersonId: search.studentPersonId,
    mentorId: search.mentorId,
    type: search.type,
    year: search.year,
    linked: search.linked,
  });

  function updateSearch(patch: Partial<StudentAchievementListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  function confirmDelete(achievement: StudentAchievement) {
    modal.confirm({
      title: "删除学生成果",
      content: `确认删除「${achievement.title}」？关联的导师成果与归档条目会同步软删。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(achievement.id);
          message.success("学生成果已删除");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "删除失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  async function handleDownload(record: StudentAchievement) {
    setDownloading(record.id);
    try {
      await downloadWithAuth(
        () => downloadStudentAchievementProof(record.id),
        `${record.title}-佐证`,
      );
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "下载失败，请稍后重试",
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <PermissionGuard code="student-achievement:list">
      <PageHeader
        title="学生成果"
        description="登记学生双创成果并关联指导教师；关联后同步进入导师考核与归档。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            {canManage ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreating(true)}
              >
                登记成果
              </Button>
            ) : null}
          </>
        }
      />

      <FilterBar>
        {canBrowseStudents ? (
          <Select
            allowClear
            showSearch
            filterOption={false}
            placeholder="全部学生"
            value={search.studentPersonId}
            onChange={(value) =>
              updateSearch({ studentPersonId: value || undefined })
            }
            onSearch={setStudentKeyword}
            options={studentOptions.data ?? []}
            loading={studentOptions.isFetching}
            style={{ minWidth: 180 }}
          />
        ) : null}
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="全部导师"
          value={search.mentorId}
          onChange={(value) => updateSearch({ mentorId: value || undefined })}
          options={(mentorOptions.data?.list ?? []).map((mentor) => ({
            value: mentor.id,
            label: `${mentor.name}（${mentor.deptName}）`,
          }))}
          loading={mentorOptions.isFetching}
          style={{ minWidth: 180 }}
        />
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
          placeholder="全部年份"
          value={search.year}
          onChange={(value) => updateSearch({ year: value })}
          options={yearOptions}
          style={{ minWidth: 120 }}
        />
        <Select
          allowClear
          placeholder="关联状态"
          value={search.linked}
          onChange={(value) => updateSearch({ linked: value })}
          options={[
            { value: 1, label: "已关联" },
            { value: 0, label: "未关联" },
          ]}
          style={{ minWidth: 120 }}
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
        <DataTable<StudentAchievement>
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
              title: "学生",
              dataIndex: "studentName",
              key: "studentName",
              width: 120,
              render: (name: string, record) => (
                <span>
                  {name}
                  <span className="tabular ml-1 text-xs text-ink-muted">
                    #{record.studentPersonId}
                  </span>
                </span>
              ),
            },
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
              width: 100,
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
              title: "指导教师",
              dataIndex: "mentorProfileId",
              key: "mentorProfileId",
              width: 120,
              render: (mentorId: string | null) =>
                mentorId ? (
                  mentorNames.get(mentorId) ?? (
                    <span className="tabular">导师编号 #{mentorId}</span>
                  )
                ) : (
                  "—"
                ),
            },
            {
              title: "关联状态",
              dataIndex: "mentorProfileId",
              key: "linked",
              width: 100,
              render: (mentorId: string | null) => (
                <StatusTag kind="linked" value={mentorId ? 1 : 0} />
              ),
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
              width: canManage ? 260 : 150,
              fixed: "right",
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
                  {canManage ? (
                    <>
                      {!record.mentorProfileId ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<LinkOutlined />}
                          onClick={() => setLinking(record)}
                        >
                          关联
                        </Button>
                      ) : null}
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDelete(record)}
                      >
                        删除
                      </Button>
                    </>
                  ) : !record.proofFileId ? (
                    <span className="text-xs text-ink-muted">只读</span>
                  ) : null}
                </div>
              ),
            },
          ]}
          emptyText={
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                search.studentPersonId || search.mentorId || search.type
                  ? "没有符合筛选条件的学生成果"
                  : "暂无学生成果"
              }
            />
          }
        />
      )}

      <FilePreview
        open={Boolean(preview)}
        title={preview ? `${preview.title}-佐证` : "佐证预览"}
        loader={
          preview
            ? () => previewStudentAchievementProof(preview.id)
            : null
        }
        onClose={() => setPreview(null)}
      />

      <CreateStudentAchievementModal
        open={creating}
        onClose={() => setCreating(false)}
        onSuccess={() => void query.refetch()}
      />
      <LinkMentorModal
        open={Boolean(linking)}
        achievement={linking}
        onClose={() => setLinking(null)}
        onSuccess={() => void query.refetch()}
      />
    </PermissionGuard>
  );
}
