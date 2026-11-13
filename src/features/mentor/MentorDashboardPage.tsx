import { Card, Skeleton, Tag } from "antd";
import {
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  StarOutlined,
  UserOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { CompactEmpty } from "../../components/CompactEmpty";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  APPOINTMENT_TYPE_LABELS,
  ASSESSMENT_GRADE_LABELS,
  enumLabel,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import { useMentorWorkbench } from "../dashboard/queries";
import { useAppointments } from "../appointments/queries";
import { useMessages } from "../messages/queries";
import { useMentorReviews, useMyMentorProfile } from "./queries";
import { TeacherDashboard } from "./TeacherDashboard";

const QUICK_ACTIONS = [
  {
    to: "/mentor/profile",
    icon: <UserOutlined />,
    label: "我的档案",
    permission: "mentor:profile",
  },
  {
    to: "/mentor/applications",
    icon: <AuditOutlined />,
    label: "申请记录",
    permission: "mentor-application:list",
  },
  {
    to: "/mentor/slots",
    icon: <ScheduleOutlined />,
    label: "可指导时段",
    permission: "mentor:slot-manage",
  },
  {
    to: "/mentor/appointments",
    icon: <CalendarOutlined />,
    label: "预约处理",
    permission: "appointment:list",
  },
  {
    to: "/mentor/records",
    icon: <FileTextOutlined />,
    label: "指导记录",
    permission: "appointment:list",
  },
  {
    to: "/assessments",
    icon: <SafetyCertificateOutlined />,
    label: "我的考核",
    permission: "assessment:list",
  },
  {
    to: "/mentor/stats",
    icon: <BarChartOutlined />,
    label: "指导统计",
    permission: "stats:guidance",
  },
  // 双创成果入口暂时隐藏，恢复时取消注释
  // {
  //   to: "/mentor/achievements",
  //   icon: <TrophyOutlined />,
  //   label: "双创成果",
  //   permission: "achievement:list",
  // },
  {
    to: "/mentor/reviews",
    icon: <StarOutlined />,
    label: "收到评价",
    permission: "review:list",
  },
  {
    to: "/archives",
    icon: <FolderOpenOutlined />,
    label: "我的归档",
    permission: "archive:list",
  },
];

/** 教师身份（尚未审核通过）与导师身份共用同一个路由。 */
export function MentorDashboardPage() {
  const { can } = useAuth();
  const approved =
    can("mentor:slot-manage") || can("appointment:handle");
  return approved ? <ApprovedMentorDashboard /> : <TeacherDashboard />;
}

function ApprovedMentorDashboard() {
  const { user, can } = useAuth();
  const profile = useMyMentorProfile();
  const mentorId = profile.data?.id ?? null;
  const workbench = useMentorWorkbench(mentorId);
  const pendingAppointments = useAppointments({
    page: 1,
    pageSize: 5,
    status: 0,
  });
  const reviews = useMentorReviews(mentorId, { page: 1, pageSize: 5 });
  const messages = useMessages({ page: 1, pageSize: 5 });
  const quickActions = QUICK_ACTIONS.filter((action) =>
    can(action.permission),
  );

  if (profile.isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
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
        <PageHeader
          title="导师工作台"
          description={`${user?.realName ?? ""} · ${user?.deptName ?? ""}`}
        />
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-2xl text-accent">
              <UserOutlined />
            </span>
            <div className="text-base font-medium text-ink">
              尚未建立导师专业档案
            </div>
            <p className="max-w-[420px] text-sm text-ink-muted">
              完善专业档案并提交入驻申请后，才能被学生检索、接收预约和参与考核。
            </p>
            <Link to="/mentor/profile" className="ant-btn ant-btn-primary">
              去建档
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const summary = workbench.data;
  const currentAssessment = summary?.currentAssessment ?? null;

  return (
    <div>
      <PageHeader
        title="导师工作台"
        description={`${user?.realName ?? ""} · ${user?.deptName ?? ""} · 档案${profile.data.status === 2 ? "已生效" : "处理中"}`}
        extra={
          <Tag color={profile.data.status === 2 ? "success" : "processing"} className="m-0">
            {profile.data.mentorType === "internal" ? "校内导师" : "校外导师"}
          </Tag>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="待确认预约"
          value={summary?.pendingAppointments ?? "—"}
          suffix="条"
          tone="amber"
          icon={<ClockCircleOutlined />}
        />
        <StatCard
          label="已确认待指导"
          value={summary?.confirmedAppointments ?? "—"}
          suffix="条"
          tone="accent"
          icon={<CalendarOutlined />}
        />
        <StatCard
          label="待学生确认"
          value={summary?.awaitingStudentConfirm ?? "—"}
          suffix="条"
          tone="teal"
          icon={<CheckCircleOutlined />}
        />
        <StatCard
          label="收到评价"
          value={summary?.reviewSummary.count ?? "—"}
          suffix="条"
          tone="slate"
          icon={<StarOutlined />}
          hint={
            summary?.reviewSummary.avg !== null &&
            summary?.reviewSummary.avg !== undefined
              ? `平均 ${summary.reviewSummary.avg.toFixed(2)} 分`
              : "暂无评分"
          }
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card
          title="待我处理"
          extra={
            <Link to="/mentor/appointments" className="text-sm">
              查看全部
            </Link>
          }
        >
          {pendingAppointments.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : pendingAppointments.isError ? (
            <QueryErrorState
              error={pendingAppointments.error}
              onRetry={() => void pendingAppointments.refetch()}
            />
          ) : pendingAppointments.data?.list.length ? (
            <div className="divide-y divide-line">
              {pendingAppointments.data.list.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">
                        {appointment.student?.realName ?? "学生"}
                      </span>
                      <Tag className="m-0">
                        {enumLabel(
                          APPOINTMENT_TYPE_LABELS,
                          appointment.type,
                        )}
                      </Tag>
                    </div>
                    <div className="mt-1 truncate text-sm text-ink-muted">
                      {appointment.topic}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      期望 {formatDateTime(appointment.requestedTime)}
                    </div>
                  </div>
                  <StatusTag kind="appointment" value={appointment.status} />
                  <Link
                    to="/mentor/appointments/$id"
                    params={{ id: appointment.id }}
                    className="text-sm"
                  >
                    处理
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <CompactEmpty text="暂无待确认预约" />
          )}
        </Card>

        <Card title="快捷入口">
          <div className="grid grid-cols-2 gap-2">
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
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card
          title="最近评价"
          extra={
            <Link to="/mentor/reviews" className="text-sm">
              全部评价
            </Link>
          }
        >
          {reviews.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : reviews.isError ? (
            <QueryErrorState
              error={reviews.error}
              onRetry={() => void reviews.refetch()}
            />
          ) : reviews.data?.list.length ? (
            <div className="divide-y divide-line">
              {reviews.data.list.map((review) => (
                <div key={review.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">
                      综合 {review.overallScore} 分
                    </span>
                    <span className="text-xs text-ink-muted">
                      态度 {review.attitude} · 能力 {review.expertise} · 效果{" "}
                      {review.effect}
                    </span>
                    <span className="ml-auto text-xs text-ink-muted">
                      {formatDateTime(review.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {review.comment || "学生未填写文字评价"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <CompactEmpty text="暂无学生评价" />
          )}
        </Card>

        <div className="grid gap-4">
          <Card
            title="当前学期考核"
            extra={
              <Link to="/assessments" className="text-sm">
                查看考核
              </Link>
            }
          >
            {currentAssessment ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">{currentAssessment.period}</span>
                  <StatusTag
                    kind="assessment"
                    value={currentAssessment.status}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">初评 / 终评</span>
                  <span className="text-ink">
                    {enumLabel(
                      ASSESSMENT_GRADE_LABELS,
                      currentAssessment.collegeGrade,
                    )}{" "}
                    /{" "}
                    {enumLabel(
                      ASSESSMENT_GRADE_LABELS,
                      currentAssessment.finalGrade,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">综合分</span>
                  <span className="tabular text-ink">
                    {currentAssessment.compositeScore ?? "—"}
                  </span>
                </div>
              </div>
            ) : (
              <CompactEmpty text="本学期暂无考核" />
            )}
          </Card>

          <Card
            title="最近消息"
            extra={
              <Link to="/messages" className="text-sm">
                消息中心
              </Link>
            }
          >
            {messages.isLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : messages.data?.list.length ? (
              <div className="divide-y divide-line">
                {messages.data.list.slice(0, 3).map((message) => (
                  <div key={message.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <MessageOutlined className="text-accent" />
                      <span className="truncate text-sm text-ink">
                        {message.title}
                      </span>
                      {!message.readAt ? (
                        <span className="ml-auto rounded bg-accent px-1.5 py-0.5 text-[11px] text-white">
                          未读
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <CompactEmpty text="暂无消息" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
