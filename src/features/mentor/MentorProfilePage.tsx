import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Skeleton,
  Tag,
} from "antd";
import { PageHeader } from "../../components/PageHeader";
import { StatusTag } from "../../components/StatusTag";
import { DataTable } from "../../components/DataTable";
import { CompactEmpty } from "../../components/CompactEmpty";
import { QueryErrorState } from "../../components/ErrorState";
import { MentorProfileForm } from "./MentorProfileForm";
import {
  MentorDraftMaterials,
  type DraftMaterial,
} from "./MentorDraftMaterials";
import { useAuth } from "../../lib/auth/AuthProvider";
import { attachMyMaterial } from "../../lib/api/endpoints/mentor";
import {
  useMyApplications,
  useMyMentorProfile,
  useSubmitOnboarding,
  useSubmitProfileChange,
  useUpdateMyContact,
  useUpdateMyProfile,
} from "./queries";
import { ApiError } from "../../lib/api/client";
import {
  APPLICATION_TYPE_LABELS,
  MENTOR_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type {
  MentorProfile,
  UpdateMentorProfileBody,
} from "../../lib/api/types";

const STAGED_PREFIX = "mentor-admin.draft-materials.";
const CHANGE_STAGED_PREFIX = "mentor-admin.change-materials.";
const CONTACT_PATTERN = /^[0-9+\-() ]{6,20}$/;

function stagedKey(userId: string | undefined, prefix: string): string | null {
  return userId ? `${prefix}${userId}` : null;
}

function loadStaged(
  userId: string | undefined,
  prefix = STAGED_PREFIX,
): DraftMaterial[] {
  const key = stagedKey(userId, prefix);
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DraftMaterial =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as DraftMaterial).fileId === "string" &&
        typeof (item as DraftMaterial).name === "string" &&
        typeof (item as DraftMaterial).kind === "number",
    );
  } catch {
    return [];
  }
}

function saveStaged(
  userId: string | undefined,
  materials: DraftMaterial[],
  prefix = STAGED_PREFIX,
): void {
  const key = stagedKey(userId, prefix);
  if (!key || typeof window === "undefined") return;
  try {
    if (!materials.length) {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, JSON.stringify(materials));
    }
  } catch {
    /* sessionStorage 不可用时只保留内存态 */
  }
}

function ProfileView({ profile }: { profile: MentorProfile }) {
  const isInternal = profile.mentorType === "internal";
  return (
    <Descriptions
      column={{ xs: 1, sm: 2 }}
      items={[
        {
          key: "type",
          label: "导师类型",
          children: enumLabel(MENTOR_TYPE_LABELS, profile.mentorType),
        },
        {
          key: "title",
          label: "职称 / 资质",
          children: profile.professionalTitle ?? "—",
        },
        {
          key: "fields",
          label: "指导方向",
          span: { xs: 1, sm: 2 },
          children: profile.researchFields.length ? (
            <div className="flex flex-wrap gap-1">
              {profile.researchFields.map((field) => (
                <Tag key={field} className="m-0">
                  {field}
                </Tag>
              ))}
            </div>
          ) : (
            "—"
          ),
        },
        ...(isInternal
          ? []
          : [
              {
                key: "affiliate",
                label: "合作单位",
                children: profile.affiliateOrg ?? "—",
              },
              {
                key: "social",
                label: "社会任职",
                children: profile.socialRoles ?? "—",
              },
            ]),
        {
          key: "summary",
          label: "个人简介",
          span: { xs: 1, sm: 2 },
          children: (
            <span className="whitespace-pre-wrap">
              {profile.summary?.trim() || "—"}
            </span>
          ),
        },
        {
          key: "achievements",
          label: "研究成果",
          span: { xs: 1, sm: 2 },
          children: (
            <span className="whitespace-pre-wrap">
              {profile.achievements?.trim() || "—"}
            </span>
          ),
        },
        {
          key: "guidance",
          label: "指导经历",
          span: { xs: 1, sm: 2 },
          children: (
            <span className="whitespace-pre-wrap">
              {profile.guidanceExperience?.trim() || "—"}
            </span>
          ),
        },
      ]}
    />
  );
}

export function MentorProfilePage() {
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const profile = useMyMentorProfile();
  const applications = useMyApplications({ page: 1, pageSize: 5 });
  const updateProfile = useUpdateMyProfile();
  const updateContact = useUpdateMyContact();
  const submitOnboarding = useSubmitOnboarding();
  const submitProfileChange = useSubmitProfileChange();
  const [changeOpen, setChangeOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactValue, setContactValue] = useState("");
  const [staged, setStaged] = useState<DraftMaterial[]>(() =>
    loadStaged(user?.id),
  );
  const [changeStaged, setChangeStaged] = useState<DraftMaterial[]>(() =>
    loadStaged(user?.id, CHANGE_STAGED_PREFIX),
  );

  function updateStaged(next: DraftMaterial[]) {
    setStaged(next);
    saveStaged(user?.id, next);
  }

  function updateChangeStaged(next: DraftMaterial[]) {
    setChangeStaged(next);
    saveStaged(user?.id, next, CHANGE_STAGED_PREFIX);
  }

  if (profile.isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (profile.isError) {
    return (
      <QueryErrorState
        error={profile.error}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  const data = profile.data;

  async function saveProfile(body: UpdateMentorProfileBody) {
    await updateProfile.mutateAsync(body);
    message.success("档案已保存");
    await profile.refetch();
  }

  async function saveContact() {
    const value = contactValue.trim();
    if (value && !CONTACT_PATTERN.test(value)) {
      message.error(
        "联系电话应为 6-20 位，可包含数字、+、-、空格或括号",
      );
      return;
    }
    try {
      await updateContact.mutateAsync(value === "" ? null : value);
      message.success("联系电话已更新");
      setContactOpen(false);
      await profile.refetch();
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "更新失败，请稍后重试",
      );
    }
  }

  function confirmSubmitOnboarding() {
    modal.confirm({
      title: data?.status === 3 ? "重新提交入驻申请" : "提交入驻申请",
      content:
        "提交的是已保存的档案内容。提交后档案进入审核，审核期间不能修改。" +
        (staged.length
          ? `已上传的 ${staged.length} 个草稿材料会一并挂到新申请。`
          : "提交后可在申请详情中上传佐证材料。"),
      okText: "确认提交",
      cancelText: "取消",
      onOk: async () => {
        try {
          const application = await submitOnboarding.mutateAsync();
          let failed = 0;
          for (const file of staged) {
            try {
              await attachMyMaterial(application.id, {
                fileId: file.fileId,
                kind: file.kind,
              });
            } catch {
              failed += 1;
            }
          }
          updateStaged([]);
          if (failed > 0) {
            message.warning(
              `入驻申请已提交，${failed} 个草稿材料挂接失败，请在申请详情中重新上传`,
            );
          } else {
            message.success(
              staged.length
                ? "入驻申请已提交，草稿材料已挂接"
                : "入驻申请已提交",
            );
          }
          await profile.refetch();
          void navigate({
            to: "/mentor/applications/$id",
            params: { id: application.id },
          });
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "提交失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="我的专业档案"
        description="维护指导方向、简介、成果与职称资质；审核通过后才能被学生检索和预约。"
        extra={
          data ? (
            <StatusTag kind="profile" value={data.status} />
          ) : (
            <Tag color="warning" className="m-0">
              未建档
            </Tag>
          )
        }
      />

      <Card title="导师信息" className="mb-4">
        <Descriptions
          column={{ xs: 1, sm: 3 }}
          items={[
            {
              key: "name",
              label: "姓名",
              children: user?.realName ?? "—",
            },
            {
              key: "dept",
              label: "所属单位",
              children: user?.deptName ?? "—",
            },
            {
              key: "mobile",
              label: "联系电话",
              children: (
                <span className="inline-flex items-center gap-1">
                  {data?.contactMobile ?? user?.mobile ?? "—"}
                  {data && !data.contactMobile && user?.mobile ? (
                    <span className="text-xs text-ink-muted">
                      （同步手机号）
                    </span>
                  ) : null}
                  {data ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setContactValue(
                          data.contactMobile ?? user?.mobile ?? "",
                        );
                        setContactOpen(true);
                      }}
                    >
                      修改
                    </Button>
                  ) : null}
                </span>
              ),
            },
            {
              key: "mentorType",
              label: "导师类型",
              children: enumLabel(
                MENTOR_TYPE_LABELS,
                data?.mentorType ?? user?.mentorType,
              ),
            },
          ]}
        />
      </Card>

      {!data ? (
        <>
          <Card title="建立导师专业档案">
            <Alert
              type="info"
              showIcon
              className="mb-5"
              title="首次建档"
              description="保存后档案为草稿状态；提交入驻申请并通过两级审核后，档案才会生效。佐证材料可以先上传到下方草稿区，提交申请后自动挂接。"
            />
            <MentorProfileForm
              initial={null}
              mentorType={user?.mentorType ?? null}
              submitLabel="保存档案"
              onSubmit={saveProfile}
            />
          </Card>
          <MentorDraftMaterials staged={staged} onChange={updateStaged} />
        </>
      ) : (
        <>
          {data.status === 1 ? (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              title="档案审核中"
              description="审核期间不能修改档案。如需修改，请先在申请记录中撤回在审申请。"
            />
          ) : null}
          {data.status === 2 ? (
            <Alert
              type="success"
              showIcon
              className="mb-4"
              title="档案已生效"
              description="修改档案字段需要提交信息修改申请，审核通过后才会写回档案。"
            />
          ) : null}
          {data.status === 3 ? (
            <Alert
              type="error"
              showIcon
              className="mb-4"
              title="档案已退回"
              description="请根据审核意见修改档案，然后重新提交入驻申请。"
            />
          ) : null}
          {data.status === 4 || data.status === 5 ? (
            <Alert
              type="error"
              showIcon
              className="mb-4"
              title={data.status === 4 ? "档案已冻结" : "档案已移除"}
              description="该状态不能修改档案，请联系创新创业学院管理员。"
            />
          ) : null}

          <Card
            title="档案信息"
            extra={
              <span className="text-xs text-ink-muted">
                导师类型由学校人员数据决定
              </span>
            }
          >
            <ProfileView profile={data} />
          </Card>

          {data.status === 0 || data.status === 3 ? (
            <>
              <Card title="修改档案" className="mt-4">
                <MentorProfileForm
                  initial={data}
                  mentorType={data.mentorType}
                  submitLabel="保存档案"
                  onSubmit={saveProfile}
                  extraActions={
                    <Button
                      type="primary"
                      onClick={confirmSubmitOnboarding}
                      loading={submitOnboarding.isPending}
                    >
                      {data.status === 3 ? "重新提交入驻申请" : "提交入驻申请"}
                    </Button>
                  }
                />
              </Card>
              <MentorDraftMaterials staged={staged} onChange={updateStaged} />
            </>
          ) : null}

          {data.status === 2 ? (
            <Card title="修改已生效档案" className="mt-4">
              <p className="mt-0 mb-4 text-sm text-ink-muted">
                修改内容会作为一条新的信息修改申请送审，审核通过后才写回档案；提交时可在申请表单中一并上传佐证材料。
              </p>
              <Button type="primary" onClick={() => setChangeOpen(true)}>
                提交信息修改申请
              </Button>
            </Card>
          ) : null}

          <Card
            title="申请记录"
            className="mt-4"
            extra={
              <Link to="/mentor/applications" className="text-sm">
                查看全部
              </Link>
            }
          >
            {applications.isLoading ? (
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
                    render: (status: number) => (
                      <StatusTag kind="application" value={status} />
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
                    width: 90,
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
                emptyText={<CompactEmpty text="暂无申请记录" />}
              />
            ) : (
              <CompactEmpty text="暂无申请记录" />
            )}
          </Card>

          <Modal
            open={changeOpen}
            title="提交信息修改申请"
            footer={null}
            width={720}
            onCancel={() => setChangeOpen(false)}
            destroyOnHidden
          >
            <p className="mb-4 text-sm text-ink-muted">
              以下内容会作为新申请送审，审核通过后才写回档案。可先上传佐证材料，提交后自动挂到新申请。
            </p>
            <div className="mb-4">
              <MentorDraftMaterials
                staged={changeStaged}
                onChange={updateChangeStaged}
                title="随申请提交的佐证材料"
                hint="可先上传；提交信息修改申请后会自动挂到新申请。提交前不会出现在申请详情里。"
                uploadTitle="上传佐证材料"
              />
            </div>
            <MentorProfileForm
              initial={data}
              mentorType={data.mentorType}
              submitLabel="提交修改申请"
              onSubmit={async (body) => {
                const application =
                  await submitProfileChange.mutateAsync(body);
                let failed = 0;
                for (const file of changeStaged) {
                  try {
                    await attachMyMaterial(application.id, {
                      fileId: file.fileId,
                      kind: file.kind,
                    });
                  } catch {
                    failed += 1;
                  }
                }
                updateChangeStaged([]);
                if (failed > 0) {
                  message.warning(
                    `信息修改申请已提交，${failed} 个佐证材料挂接失败，请在申请详情中重新上传`,
                  );
                } else {
                  message.success(
                    changeStaged.length
                      ? "信息修改申请已提交，佐证材料已挂接"
                      : "信息修改申请已提交",
                  );
                }
                setChangeOpen(false);
                await profile.refetch();
                void navigate({
                  to: "/mentor/applications/$id",
                  params: { id: application.id },
                });
              }}
            />
          </Modal>

          <Modal
            open={contactOpen}
            title="修改联系电话"
            okText="保存"
            cancelText="取消"
            confirmLoading={updateContact.isPending}
            onOk={() => void saveContact()}
            onCancel={() => setContactOpen(false)}
            destroyOnHidden
          >
            <Input
              value={contactValue}
              onChange={(event) => setContactValue(event.target.value)}
              placeholder="请输入联系电话"
              maxLength={20}
              allowClear
            />
            <p className="mt-2 text-xs text-ink-muted">
              留空并保存 = 回退到学校同步的手机号。
            </p>
          </Modal>
        </>
      )}
    </div>
  );
}
