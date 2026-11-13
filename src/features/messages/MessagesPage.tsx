import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  App,
  Button,
  Empty,
  Input,
  Modal,
  Pagination,
  Segmented,
  Select,
  Tag,
} from "antd";
import { CheckOutlined, ReloadOutlined, SendOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useDepts } from "../../lib/hooks/useDepts";
import { flattenDepts } from "../../lib/tree";
import {
  MESSAGE_TYPE_LABELS,
  enumLabel,
  toOptions,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type { MessageListSearch } from "../../lib/list-search";
import {
  useMarkAllRead,
  useMarkMessageRead,
  useMessages,
  useSendMessage,
  useSentMessages,
} from "./queries";
import {
  MessageUserSelect,
  type MessageUserOption,
} from "./MessageUserSelect";

const RECIPIENT_ROLE_OPTIONS = [
  { value: "mentor", label: "导师" },
  { value: "teacher", label: "教师" },
  { value: "student", label: "学生" },
  { value: "college_admin", label: "二级学院管理员" },
  { value: "sc_admin", label: "创新创业学院管理员" },
];

type RecipientMode = "group" | "users";

export function MessagesPage() {
  const search = useSearch({ from: "/_app/messages" });
  const navigate = useNavigate({ from: "/messages" });
  const { message } = App.useApp();
  const { can, isSuperAdmin } = useAuth();
  const canSend = can("message:send");
  const canPickUsers = isSuperAdmin || can("user:list");
  const markRead = useMarkMessageRead();
  const markAll = useMarkAllRead();
  const sendMessage = useSendMessage();
  const depts = useDepts();
  const [sendOpen, setSendOpen] = useState(false);
  const [view, setView] = useState<"inbox" | "sent">("inbox");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("group");
  const [roleCodes, setRoleCodes] = useState<string[]>(["mentor"]);
  const [deptId, setDeptId] = useState<string | undefined>(undefined);
  const [selectedUsers, setSelectedUsers] = useState<MessageUserOption[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;

  const query = useMessages({
    page,
    pageSize,
    read: search.read,
    type: search.type,
  });
  const sentQuery = useSentMessages(
    { page, pageSize, read: search.read, type: search.type },
    canSend && view === "sent",
  );
  const activeQuery = view === "sent" ? sentQuery : query;

  function updateSearch(patch: Partial<MessageListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  function openSendModal() {
    setSendOpen(true);
  }

  async function handleRead(id: string) {
    try {
      await markRead.mutateAsync(id);
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "标记失败，请稍后重试",
      );
    }
  }

  async function handleReadAll() {
    try {
      const result = await markAll.mutateAsync();
      message.success(
        result.updated > 0 ? `已标记 ${result.updated} 条消息为已读` : "没有未读消息",
      );
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "操作失败，请稍后重试",
      );
    }
  }

  async function handleSend() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (trimmedTitle === "" || trimmedContent === "") {
      message.warning("请填写标题和正文");
      return;
    }
    if (recipientMode === "users") {
      if (selectedUsers.length === 0) {
        message.warning("请至少选择一位收件用户");
        return;
      }
    } else if (roleCodes.length === 0 && deptId === undefined) {
      message.warning("请至少选择收件角色或部门");
      return;
    }
    try {
      const result = await sendMessage.mutateAsync(
        recipientMode === "users"
          ? {
              recipientUserIds: selectedUsers.map((user) => user.value),
              title: trimmedTitle,
              content: trimmedContent,
            }
          : {
              ...(roleCodes.length === 0
                ? {}
                : { recipientRoleCodes: roleCodes }),
              ...(deptId === undefined ? {} : { deptId }),
              title: trimmedTitle,
              content: trimmedContent,
            },
      );
      message.success(
        `已发送 ${result.sent} 条` +
          (result.skipped > 0 ? `，跳过 ${result.skipped} 条` : ""),
      );
      setSendOpen(false);
      setTitle("");
      setContent("");
      setSelectedUsers([]);
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "发送失败，请稍后重试",
      );
    }
  }

  return (
    <PermissionGuard code="message:list">
      <PageHeader
        title="消息中心"
        description={
          canSend
            ? "查看预约、指导记录、考核提醒与系统通知；管理员可按角色、部门或指定用户发送站内通知。"
            : "查看预约、指导记录、考核提醒与系统通知。"
        }
        extra={
          <>
            {canSend ? (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={openSendModal}
              >
                新建消息
              </Button>
            ) : null}
            <Button
              icon={<ReloadOutlined />}
              loading={activeQuery.isFetching}
              onClick={() => void activeQuery.refetch()}
            >
              刷新
            </Button>
            {view === "inbox" ? (
              <Button
                icon={<CheckOutlined />}
                loading={markAll.isPending}
                onClick={() => void handleReadAll()}
              >
                全部已读
              </Button>
            ) : null}
          </>
        }
      />

      <FilterBar>
        {canSend ? (
          <Segmented
            value={view}
            onChange={(value) => setView(value as "inbox" | "sent")}
            options={[
              { label: "收件箱", value: "inbox" },
              { label: "已发送", value: "sent" },
            ]}
          />
        ) : null}
        <Select
          allowClear
          placeholder="全部状态"
          value={search.read}
          onChange={(value) => updateSearch({ read: value })}
          options={[
            { value: 0, label: view === "sent" ? "收件人未读" : "未读" },
            { value: 1, label: view === "sent" ? "收件人已读" : "已读" },
          ]}
          style={{ minWidth: 120 }}
        />
        <Select
          allowClear
          placeholder="全部类型"
          value={search.type}
          onChange={(value) => updateSearch({ type: value })}
          options={toOptions(MESSAGE_TYPE_LABELS, [1, 2, 3, 4])}
          style={{ minWidth: 150 }}
        />
        <span className="ml-auto text-xs text-ink-muted">
          {view === "sent"
            ? `共 ${sentQuery.data?.total ?? 0} 条`
            : `未读 ${query.data?.unread ?? 0} 条 · 共 ${query.data?.total ?? 0} 条`}
        </span>
      </FilterBar>

      {activeQuery.isError ? (
        <QueryErrorState
          error={activeQuery.error}
          onRetry={() => void activeQuery.refetch()}
        />
      ) : view === "sent" ? (
        sentQuery.data?.list.length ? (
          <div className="overflow-hidden rounded-[10px] border border-line bg-card">
            <div className="divide-y divide-line">
              {sentQuery.data.list.map((item) => (
                <div key={item.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="m-0">
                      {enumLabel(MESSAGE_TYPE_LABELS, item.type)}
                    </Tag>
                    <span className="text-xs text-ink-muted">
                      收件人：{item.recipientName ?? `编号 #${item.recipientUserId}`}
                    </span>
                    {item.readAt ? (
                      <Tag color="default" className="m-0">
                        已读
                      </Tag>
                    ) : (
                      <Tag color="processing" className="m-0">
                        未读
                      </Tag>
                    )}
                    <span className="ml-auto text-xs text-ink-muted">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-ink">
                    {item.title}
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink-muted">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[10px] border border-line bg-card py-12">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                search.read !== undefined || search.type !== undefined
                  ? "没有符合筛选条件的消息"
                  : "暂无已发送消息"
              }
            />
          </div>
        )
      ) : query.data?.list.length ? (
        <div className="overflow-hidden rounded-[10px] border border-line bg-card">
          <div className="divide-y divide-line">
            {query.data.list.map((item) => (
              <div
                key={item.id}
                className={`flex gap-3 px-4 py-3.5 transition-colors ${
                  item.readAt ? "bg-card" : "bg-accent-soft/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="m-0">
                      {enumLabel(MESSAGE_TYPE_LABELS, item.type)}
                    </Tag>
                    <span className="text-xs text-ink-muted">
                      {item.senderName
                        ? `发送人：${item.senderName}`
                        : "系统消息"}
                    </span>
                    {!item.readAt ? (
                      <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-white">
                        未读
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-ink-muted">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-ink">
                    {item.title}
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink-muted">
                    {item.content}
                  </div>
                </div>
                {!item.readAt ? (
                  <Button
                    type="link"
                    size="small"
                    loading={markRead.isPending}
                    onClick={() => void handleRead(item.id)}
                  >
                    标记已读
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[10px] border border-line bg-card py-12">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              search.read !== undefined || search.type !== undefined
                ? "没有符合筛选条件的消息"
                : "暂无消息"
            }
          />
        </div>
      )}

      {activeQuery.data && activeQuery.data.total > pageSize ? (
        <div className="mt-4 flex justify-end">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={activeQuery.data.total}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            showTotal={(total) => `共 ${total} 条`}
            onChange={(nextPage, nextSize) =>
              updateSearch({ page: nextPage, pageSize: nextSize })
            }
          />
        </div>
      ) : null}

      <Modal
        title="发送站内消息"
        open={sendOpen}
        okText="发送"
        cancelText="取消"
        confirmLoading={sendMessage.isPending}
        onOk={() => void handleSend()}
        onCancel={() => setSendOpen(false)}
        destroyOnHidden
        width={560}
      >
        <div className="space-y-4 pt-2">
          <div>
            <div className="mb-1.5 text-sm font-medium text-ink">收件方式</div>
            <Segmented
              block
              value={recipientMode}
              onChange={(value) => setRecipientMode(value as RecipientMode)}
              options={[
                { label: "按角色 / 部门", value: "group" },
                ...(canPickUsers
                  ? [{ label: "指定用户", value: "users" }]
                  : []),
              ]}
            />
          </div>

          {recipientMode === "group" ? (
            <>
              <div>
                <div className="mb-1.5 text-sm font-medium text-ink">
                  收件角色
                </div>
                <Select
                  mode="multiple"
                  value={roleCodes}
                  onChange={(value) => setRoleCodes(value)}
                  options={RECIPIENT_ROLE_OPTIONS}
                  placeholder="选择角色（可多选）"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <div className="mb-1.5 text-sm font-medium text-ink">
                  限定部门（可选）
                </div>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={deptId}
                  onChange={(value) => setDeptId(value)}
                  options={flattenDepts(depts.data ?? [])}
                  loading={depts.isLoading}
                  placeholder="不选 = 不限部门"
                  style={{ width: "100%" }}
                />
              </div>
              <p className="m-0 text-xs text-ink-muted">
                角色与部门同时选择时按交集发送；发送范围受当前账号的数据权限限制。
              </p>
            </>
          ) : (
            <>
              <div>
                <div className="mb-1.5 text-sm font-medium text-ink">
                  收件用户
                </div>
                <MessageUserSelect
                  value={selectedUsers}
                  onChange={setSelectedUsers}
                />
              </div>
              <p className="m-0 text-xs text-ink-muted">
                按姓名搜索启用账号，可精确指定收件人；单次最多 1000 人。
              </p>
            </>
          )}

          <div>
            <div className="mb-1.5 text-sm font-medium text-ink">标题</div>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              showCount
              placeholder="请输入消息标题"
            />
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium text-ink">正文</div>
            <Input.TextArea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={500}
              showCount
              rows={4}
              placeholder="请输入消息正文"
            />
          </div>
          <p className="m-0 text-xs text-ink-muted">
            消息类型固定为「系统通知」，发送后收件人会在消息中心收到未读提醒。
          </p>
        </div>
      </Modal>
    </PermissionGuard>
  );
}
