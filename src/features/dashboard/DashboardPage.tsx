import { useState } from "react";
import { Button, Card, Skeleton, Tag } from "antd";
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  TeamOutlined,
  TrophyOutlined,
  AuditOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { CompactEmpty } from "../../components/CompactEmpty";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  APPLICATION_TYPE_LABELS,
  MESSAGE_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import {
  usePendingApplications,
  useRecentMessages,
  useWorkProgress,
} from "./queries";
import { ReminderModal } from "./ReminderModal";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "您好";
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export function DashboardPage() {
  const { user, can, isSuperAdmin } = useAuth();
  const canWorkProgress = can("work:progress");
  const canApplications = can("mentor-application:list");

  const pendingStatus = can("mentor-application:review-college")
    ? 2
    : can("mentor-application:review-sc")
      ? 4
      : null;

  const workProgress = useWorkProgress(canWorkProgress);
  const applications = usePendingApplications(pendingStatus, canApplications);
  const messages = useRecentMessages(can("message:list"));
  const [reminding, setReminding] = useState(false);

  const summary = workProgress.data;

  const quickActions = [
    {
      code: "mentor-application:list",
      to: "/applications",
      icon: <AuditOutlined />,
      label: "入驻审核",
    },
    {
      code: "mentor:search",
      to: "/mentors",
      icon: <SolutionOutlined />,
      label: "导师资源库",
    },
    {
      code: "appointment:list",
      to: "/appointments",
      icon: <CalendarOutlined />,
      label: "预约管理",
    },
    {
      code: "assessment:list",
      to: "/assessments",
      icon: <SafetyCertificateOutlined />,
      label: "考核管理",
    },
    {
      code: "stats:mentor",
      to: "/stats",
      icon: <BarChartOutlined />,
      label: "统计分析",
    },
    {
      code: "archive:list",
      to: "/archives",
      icon: <FolderOpenOutlined />,
      label: "归档管理",
    },
    {
      code: "student-achievement:list",
      to: "/student-achievements",
      icon: <TrophyOutlined />,
      label: "学生成果",
    },
    {
      code: "config:list",
      to: "/system/configs",
      icon: <SettingOutlined />,
      label: "系统配置",
    },
  ].filter((action) => isSuperAdmin || can(action.code));

  return (
    <div>
      <PageHeader
        title={`${greeting()}，${user?.realName ?? "管理员"}`}
        description={`${user?.deptName ?? ""} · 今天是 ${new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="导师总数"
          value={summary?.totalMentors ?? "—"}
          suffix="人"
          tone="accent"
          icon={<TeamOutlined />}
          hint="已生效导师档案"
        />
        <StatCard
          label="待确认预约"
          value={summary?.pendingAppointments ?? "—"}
          suffix="条"
          tone="amber"
          icon={<ClockCircleOutlined />}
          hint="等待导师处理"
        />
        <StatCard
          label="逾期未填记录"
          value={summary?.missingRecords ?? "—"}
          suffix="条"
          tone="danger"
          icon={<FileTextOutlined />}
          hint="需要提醒导师"
        />
        <StatCard
          label="待处理考核"
          value={summary?.pendingAssessments ?? "—"}
          suffix="项"
          tone="teal"
          icon={<CheckCircleOutlined />}
          hint="本学期考核节点"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card
          title="待我审核"
          extra={
            canApplications ? (
              <Link to="/applications" className="text-sm">
                查看全部
              </Link>
            ) : null
          }
        >
          {!canApplications ? (
            <CompactEmpty text="当前账号没有审核权限" />
          ) : applications.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : applications.data?.list.length ? (
            <div className="divide-y divide-line">
              {applications.data.list.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag className="m-0">
                        {enumLabel(APPLICATION_TYPE_LABELS, application.type)}
                      </Tag>
                      <span className="tabular text-xs text-ink-muted">
                        申请人编号 #{application.applicantId}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-ink-muted">
                      提交于 {formatDateTime(application.submittedAt)}
                    </div>
                  </div>
                  <StatusTag kind="application" value={application.status} />
                  <Link
                    to="/applications/$id"
                    params={{ id: application.id }}
                    className="text-sm"
                  >
                    审核
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <CompactEmpty text="暂无待审核申请" />
          )}
        </Card>

        <Card title="快捷入口">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to as never}
                className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm text-ink no-underline transition-colors hover:border-accent hover:bg-accent-soft"
              >
                <span className="text-base text-accent">{action.icon}</span>
                {action.label}
              </Link>
            ))}
            {quickActions.length === 0 ? (
              <div className="col-span-full text-sm text-ink-muted">
                暂无可用的快捷入口。
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card
          title="导师工作进度"
          extra={
            can("reminder:send") ? (
              <Button
                size="small"
                icon={<BellOutlined />}
                onClick={() => setReminding(true)}
              >
                发送提醒
              </Button>
            ) : null
          }
        >
          {workProgress.isLoading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : (
            <DataTable
              dataSource={summary?.mentors ?? []}
              columns={[
                {
                  title: "导师",
                  dataIndex: "mentorName",
                  key: "mentorName",
                  render: (name: string, record) => (
                    <Link
                      to="/mentors/$id"
                      params={{ id: record.mentorProfileId }}
                      className="font-medium"
                    >
                      {name}
                    </Link>
                  ),
                },
                {
                  title: "待确认预约",
                  dataIndex: "pendingAppointments",
                  key: "pendingAppointments",
                  align: "right",
                  width: 120,
                },
                {
                  title: "逾期未填",
                  dataIndex: "missingRecords",
                  key: "missingRecords",
                  align: "right",
                  width: 100,
                },
                {
                  title: "待处理考核",
                  dataIndex: "pendingAssessments",
                  key: "pendingAssessments",
                  align: "right",
                  width: 110,
                },
              ]}
              pagination={false}
              wrapped={false}
              emptyText={<CompactEmpty text="暂无导师进度数据" />}
            />
          )}
        </Card>

        <Card
          title="最近消息"
          extra={
            can("message:list") ? (
              <Link to="/messages" className="text-sm">
                消息中心
              </Link>
            ) : null
          }
        >
          {!can("message:list") ? (
            <CompactEmpty text="当前账号没有消息权限" />
          ) : messages.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : messages.data?.list.length ? (
            <div className="divide-y divide-line">
              {messages.data.list.map((message) => (
                <div key={message.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Tag className="m-0">
                      {enumLabel(MESSAGE_TYPE_LABELS, message.type)}
                    </Tag>
                    {!message.readAt ? (
                      <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-white">
                        未读
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-ink-muted">
                      {formatDateTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-ink">
                    {message.title}
                  </div>
                  <div className="truncate text-xs text-ink-muted">
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CompactEmpty text="暂无消息" />
          )}
        </Card>
      </div>

      <ReminderModal
        open={reminding}
        mentors={summary?.mentors ?? []}
        onClose={() => setReminding(false)}
      />
    </div>
  );
}
