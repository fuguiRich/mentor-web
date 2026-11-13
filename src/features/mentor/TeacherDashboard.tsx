import { useState } from "react";
import { Alert, App, Button, Card, Skeleton, Steps, Tag } from "antd";
import {
  AuditOutlined,
  MessageOutlined,
  SolutionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { CompactEmpty } from "../../components/CompactEmpty";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import {
  APPLICATION_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import { useMessages } from "../messages/queries";
import {
  useMyApplications,
  useMyMentorProfile,
} from "./queries";

function stepOf(status: number | null | undefined): number {
  if (status === 1) return 2;
  if (status === 2) return 4;
  return 0;
}

export function TeacherDashboard() {
  const { user, can, reloadProfile } = useAuth();
  const { message } = App.useApp();
  const profile = useMyMentorProfile();
  const applications = useMyApplications({ page: 1, pageSize: 5 });
  const messages = useMessages({ page: 1, pageSize: 5 });
  const [refreshing, setRefreshing] = useState(false);

  async function refreshPermissions() {
    setRefreshing(true);
    try {
      await reloadProfile();
      message.success("账号权限已刷新");
    } catch {
      message.error("刷新失败，请重新登录后再试");
    } finally {
      setRefreshing(false);
    }
  }

  if (profile.isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (profile.isError) {
    if (profile.error instanceof ApiError && profile.error.code === 10003) {
      return (
        <div>
          <PageHeader
            title="导师申请"
            description={`${user?.realName ?? ""} · ${user?.deptName ?? ""}`}
          />
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            title="当前账号还没有同步到人员数据"
            description="当前账号尚未同步到学校人员数据。请确认人事系统已有该教师，并由管理员在「系统管理 → 定时同步」触发一次统一认证同步；同步完成后重新登录即可建档。"
          />
          <Card>
            <div className="flex flex-wrap gap-2">
              <Link to="/mentor/applications">
                <Button icon={<AuditOutlined />}>申请记录</Button>
              </Link>
              <Link to="/messages">
                <Button icon={<MessageOutlined />}>消息中心</Button>
              </Link>
            </div>
          </Card>
        </div>
      );
    }
    return (
      <QueryErrorState
        error={profile.error}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  const data = profile.data;
  const status = data?.status ?? null;

  return (
    <div>
      <PageHeader
        title="导师申请"
        description={`${user?.realName ?? ""} · ${user?.deptName ?? ""} · 完善档案并提交入驻申请，审核通过后自动获得导师能力`}
      />

      {!data ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          title="尚未建立导师专业档案"
          description="教师账号可以先完善专业档案，再提交入驻申请；两级审核通过后自动追加导师角色。"
        />
      ) : status === 0 ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title="档案草稿"
          description="档案已保存，但尚未提交入驻申请。提交后进入二级学院审核。"
        />
      ) : status === 1 ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          title="入驻审核中"
          description="审核期间不能修改档案；如需撤回，请到申请记录操作。"
        />
      ) : status === 2 ? (
        <Alert
          type="success"
          showIcon
          className="mb-4"
          title="档案已生效"
          description="导师能力已开通。如果导师工作台仍不可见，请刷新账号权限或重新登录。"
        />
      ) : status === 3 ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title="档案已退回"
          description="请根据审核意见修改档案后重新提交入驻申请。"
        />
      ) : status === 4 || status === 5 ? (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title={status === 4 ? "档案已冻结" : "档案已移除"}
          description="请联系创新创业学院管理员。"
        />
      ) : null}

      <Card title="入驻流程" className="mb-4">
        <Steps
          size="small"
          current={stepOf(status)}
          items={[
            { title: "完善档案" },
            { title: "提交申请" },
            { title: "二级学院审核" },
            { title: "创新创业学院审核" },
            { title: "已生效" },
          ]}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/mentor/profile">
            <Button type="primary" icon={<UserOutlined />}>
              {data ? "查看 / 完善档案" : "去建档"}
            </Button>
          </Link>
          <Link to="/mentor/applications">
            <Button icon={<AuditOutlined />}>申请记录</Button>
          </Link>
          {status === 2 ? (
            <Button loading={refreshing} onClick={() => void refreshPermissions()}>
              刷新账号权限
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card
          title="最近申请"
          extra={
            <Link to="/mentor/applications" className="text-sm">
              查看全部
            </Link>
          }
        >
          {!can("mentor-application:list") ? (
            <CompactEmpty text="当前账号没有申请查看权限" />
          ) : applications.isLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : applications.isError ? (
            <QueryErrorState
              error={applications.error}
              onRetry={() => void applications.refetch()}
            />
          ) : applications.data?.list.length ? (
            <DataTable
              dataSource={applications.data.list}
              pagination={false}
              wrapped={false}
              columns={[
                {
                  title: "编号",
                  dataIndex: "id",
                  key: "id",
                  width: 90,
                  render: (id: string) => (
                    <span className="tabular">#{id}</span>
                  ),
                },
                {
                  title: "类型",
                  dataIndex: "type",
                  key: "type",
                  width: 120,
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
                  width: 150,
                  render: (value: number) => (
                    <StatusTag kind="application" value={value} />
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
                  width: 80,
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
              emptyText={<CompactEmpty text="暂无申请" />}
            />
          ) : (
            <CompactEmpty text="暂无申请，请先完善档案并提交入驻申请" />
          )}
        </Card>

        <div className="grid gap-4">
          <Card title="快捷入口">
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/mentor/profile"
                className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm text-ink no-underline transition-colors hover:border-accent hover:bg-accent-soft"
              >
                <UserOutlined className="text-accent" /> 完善档案
              </Link>
              <Link
                to="/mentor/applications"
                className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm text-ink no-underline transition-colors hover:border-accent hover:bg-accent-soft"
              >
                <AuditOutlined className="text-accent" /> 申请记录
              </Link>
              {can("mentor:search") ? (
                <Link
                  to="/mentors"
                  className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm text-ink no-underline transition-colors hover:border-accent hover:bg-accent-soft"
                >
                  <SolutionOutlined className="text-accent" /> 导师检索
                </Link>
              ) : null}
              {can("message:list") ? (
                <Link
                  to="/messages"
                  className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm text-ink no-underline transition-colors hover:border-accent hover:bg-accent-soft"
                >
                  <MessageOutlined className="text-accent" /> 消息中心
                </Link>
              ) : null}
            </div>
          </Card>

          <Card
            title="最近消息"
            extra={
              <Link to="/messages" className="text-sm">
                消息中心
              </Link>
            }
          >
            {!can("message:list") ? (
              <CompactEmpty text="当前账号没有消息权限" />
            ) : messages.isLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : messages.data?.list.length ? (
              <div className="divide-y divide-line">
                {messages.data.list.slice(0, 3).map((item) => (
                  <div key={item.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <MessageOutlined className="text-accent" />
                      <span className="truncate text-sm text-ink">
                        {item.title}
                      </span>
                      {!item.readAt ? (
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
