import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  InputNumber,
  Skeleton,
  Switch,
  Tag,
} from "antd";
import {
  PlayCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { FormField } from "../../components/FormField";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { SYNC_MODE_LABELS, enumLabel } from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type { SyncListSearch } from "../../lib/list-search";
import type { SyncRun } from "../../lib/api/types";
import {
  useRunSync,
  useSyncRuns,
  useSyncSchedule,
  useUpdateSyncSchedule,
} from "./queries";

const schema = z.object({
  enabled: z.boolean(),
  intervalSeconds: z
    .number()
    .int()
    .min(60, "增量同步间隔不能小于 60 秒"),
  fullIntervalSeconds: z
    .number()
    .int()
    .min(3600, "全量同步间隔不能小于 3600 秒"),
  studentsEnabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function formatInterval(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400} 天`;
  if (seconds % 3600 === 0) return `${seconds / 3600} 小时`;
  if (seconds % 60 === 0) return `${seconds / 60} 分钟`;
  return `${seconds} 秒`;
}

export function SyncSchedulePage() {
  const { can } = useAuth();
  const { message } = App.useApp();
  const search = useSearch({ from: "/_app/system/sync" });
  const navigate = useNavigate({ from: "/system/sync" });
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 10;
  const source = search.source ?? "sso";

  const schedule = useSyncSchedule();
  const updateSchedule = useUpdateSyncSchedule();
  const runMutation = useRunSync();
  const runs = useSyncRuns({ page, pageSize, source });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      enabled: true,
      intervalSeconds: 21600,
      fullIntervalSeconds: 604800,
      studentsEnabled: false,
    },
  });

  useEffect(() => {
    if (!schedule.data) return;
    // 轮询刷新时不要覆盖用户正在编辑的表单
    if (form.formState.isDirty) return;
    form.reset({
      enabled: schedule.data.enabled,
      intervalSeconds: schedule.data.intervalSeconds,
      fullIntervalSeconds: schedule.data.fullIntervalSeconds,
      studentsEnabled: schedule.data.studentsEnabled,
    });
  }, [schedule.data, form]);

  async function save(values: FormValues) {
    try {
      await updateSchedule.mutateAsync(values);
      form.reset(values);
      message.success("定时同步设置已保存");
      await schedule.refetch();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "保存失败，请稍后重试",
        );
      }
    }
  }

  async function run(mode: "incremental" | "full") {
    try {
      const result = await runMutation.mutateAsync({ mode });
      message.success(`同步任务已提交（runId ${result.runId}）`);
      await schedule.refetch();
      await runs.refetch();
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === 10006 || error.httpStatus === 409)
      ) {
        message.warning("已有同步正在运行，请稍后再试");
        await schedule.refetch();
        return;
      }
      message.error(
        error instanceof ApiError ? error.message : "触发失败，请稍后重试",
      );
    }
  }

  const data = schedule.data;
  const running = data?.running === true || runMutation.isPending;

  return (
    <PermissionGuard code="sync:manage">
      <PageHeader
        title="定时同步"
        description="管理统一认证的组织 / 教师 / 学生定时同步，查看运行流水并手动触发。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={schedule.isFetching || runs.isFetching}
              onClick={() => {
                void schedule.refetch();
                void runs.refetch();
              }}
            >
              刷新
            </Button>
            {can("sync:run") ? (
              <>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={runMutation.isPending}
                  disabled={running}
                  onClick={() => void run("incremental")}
                >
                  立即增量同步
                </Button>
                <Button
                  icon={<SyncOutlined />}
                  loading={runMutation.isPending}
                  disabled={running}
                  onClick={() => void run("full")}
                >
                  立即全量同步
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {schedule.isError ? (
        <QueryErrorState
          error={schedule.error}
          onRetry={() => void schedule.refetch()}
        />
      ) : schedule.isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : data ? (
        <>
          {data.running ? (
            <Alert
              type="info"
              showIcon
              className="mb-4"
              title="同步正在运行"
              description="页面每 5 秒自动刷新状态；也可以手动刷新。"
            />
          ) : null}
          {!data.running && data.lastRun?.status === 0 ? (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              title="上一条同步仍标记为运行中"
              description="可能是进程重启遗留的流水；下一次同步或手动触发会清理。"
            />
          ) : null}
          {!data.studentsEnabled ? (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              title="学生同步未启用"
              description="需要 SSO 应用具备 edu:classes 能力键；启用后下一次同步会导入学生并绑定 student 角色。"
            />
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <Card title="同步设置">
              <form onSubmit={form.handleSubmit(save)}>
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="enabled"
                    label="启用定时同步"
                  >
                    {(field) => (
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={field.onChange}
                        checkedChildren="开"
                        unCheckedChildren="关"
                      />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="studentsEnabled"
                    label="同步学生"
                    extra="需要 SSO edu:classes 能力键"
                  >
                    {(field) => (
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={field.onChange}
                        checkedChildren="开"
                        unCheckedChildren="关"
                      />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="intervalSeconds"
                    label="增量同步间隔（秒）"
                    required
                    extra={`当前 ${formatInterval(form.watch("intervalSeconds") ?? 0)}；最小 60 秒`}
                  >
                    {(field) => (
                      <InputNumber
                        min={60}
                        precision={0}
                        value={Number(field.value)}
                        onChange={(value) => field.onChange(value ?? 60)}
                        style={{ width: "100%" }}
                      />
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="fullIntervalSeconds"
                    label="全量同步间隔（秒）"
                    required
                    extra={`当前 ${formatInterval(form.watch("fullIntervalSeconds") ?? 0)}；最小 3600 秒`}
                  >
                    {(field) => (
                      <InputNumber
                        min={3600}
                        precision={0}
                        value={Number(field.value)}
                        onChange={(value) => field.onChange(value ?? 3600)}
                        style={{ width: "100%" }}
                      />
                    )}
                  </FormField>
                </div>
                <p className="mt-2 mb-4 text-xs text-ink-muted">
                  保存后立即重新排期；多实例部署下其他副本会在 60 秒内回读生效。
                </p>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateSchedule.isPending}
                >
                  保存设置
                </Button>
              </form>
            </Card>

            <Card title="运行状态">
              <Descriptions
                column={1}
                size="small"
                items={[
                  {
                    key: "running",
                    label: "当前状态",
                    children: data.running ? (
                      <Tag color="processing">运行中</Tag>
                    ) : (
                      <Tag>空闲</Tag>
                    ),
                  },
                  {
                    key: "next",
                    label: "下次触发",
                    children: data.nextRunAt
                      ? formatDateTime(data.nextRunAt)
                      : "未启用",
                  },
                  {
                    key: "interval",
                    label: "增量 / 全量间隔",
                    children: `${formatInterval(data.intervalSeconds)} / ${formatInterval(data.fullIntervalSeconds)}`,
                  },
                  {
                    key: "students",
                    label: "学生同步",
                    children: data.studentsEnabled ? "启用" : "关闭",
                  },
                  {
                    key: "last",
                    label: "最近一次",
                    children: data.lastRun ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusTag
                            kind="sync"
                            value={data.lastRun.status}
                          />
                          <Tag className="m-0">
                            {enumLabel(
                              SYNC_MODE_LABELS,
                              data.lastRun.mode,
                            )}
                          </Tag>
                          <span className="tabular text-xs text-ink-muted">
                            #{data.lastRun.id}
                          </span>
                        </div>
                        <div className="text-xs text-ink-muted">
                          {formatDateTime(data.lastRun.startedAt)} →{" "}
                          {formatDateTime(data.lastRun.finishedAt)}
                        </div>
                        <div className="text-xs text-ink-muted">
                          总数 {data.lastRun.total} · 成功{" "}
                          {data.lastRun.okCount} · 失败{" "}
                          {data.lastRun.failCount}
                        </div>
                      </div>
                    ) : (
                      "从未运行"
                    ),
                  },
                ]}
              />
            </Card>
          </div>

          <Card
            title="同步流水"
            className="mt-4"
            extra={
              <span className="text-xs text-ink-muted">
                数据源：{source === "sso" ? "统一认证" : source}
              </span>
            }
          >
            {runs.isError ? (
              <QueryErrorState
                error={runs.error}
                onRetry={() => void runs.refetch()}
              />
            ) : (
              <DataTable<SyncRun>
                dataSource={runs.data?.rows ?? []}
                loading={runs.isLoading}
                total={runs.data?.total}
                page={page}
                pageSize={pageSize}
                wrapped={false}
                onPageChange={(nextPage, nextSize) =>
                  void navigate({
                    search: (prev: Partial<SyncListSearch>) => ({
                      ...prev,
                      page: nextPage,
                      pageSize: nextSize,
                      source,
                    }),
                  })
                }
                columns={[
                  {
                    title: "流水号",
                    dataIndex: "id",
                    key: "id",
                    width: 90,
                    render: (id: string) => (
                      <span className="tabular">#{id}</span>
                    ),
                  },
                  {
                    title: "模式",
                    dataIndex: "mode",
                    key: "mode",
                    width: 90,
                    render: (mode: string) => (
                      <Tag className="m-0">
                        {enumLabel(SYNC_MODE_LABELS, mode)}
                      </Tag>
                    ),
                  },
                  {
                    title: "状态",
                    dataIndex: "status",
                    key: "status",
                    width: 110,
                    render: (status: number) => (
                      <StatusTag kind="sync" value={status} />
                    ),
                  },
                  {
                    title: "开始时间",
                    dataIndex: "startedAt",
                    key: "startedAt",
                    width: 170,
                    render: (value: string) => formatDateTime(value),
                  },
                  {
                    title: "结束时间",
                    dataIndex: "finishedAt",
                    key: "finishedAt",
                    width: 170,
                    render: (value: string | null) => formatDateTime(value),
                  },
                  {
                    title: "总数",
                    dataIndex: "total",
                    key: "total",
                    width: 90,
                    align: "right",
                  },
                  {
                    title: "成功",
                    dataIndex: "okCount",
                    key: "okCount",
                    width: 90,
                    align: "right",
                  },
                  {
                    title: "失败",
                    dataIndex: "failCount",
                    key: "failCount",
                    width: 90,
                    align: "right",
                  },
                ]}
                emptyText={<Empty description="暂无同步流水" />}
              />
            )}
          </Card>
        </>
      ) : null}
    </PermissionGuard>
  );
}
