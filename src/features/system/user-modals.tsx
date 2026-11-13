import { useEffect, useState } from "react";
import { Alert, App, Input, Modal, Select } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../../components/FormField";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../../lib/auth/AuthProvider";
import { applyApiFieldErrors } from "../../lib/forms";
import { useDepts } from "../../lib/hooks/useDepts";
import { flattenDepts } from "../../lib/tree";
import type { User } from "../../lib/api/types";
import {
  useAllRoles,
  useAssignUserRoles,
  useCreateUserAccount,
  useResetUserPassword,
  useUser,
} from "./queries";

// ---------- 新建账号 ----------

const createSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名").max(50),
  realName: z.string().trim().min(1, "请输入真实姓名").max(50),
  employeeNo: z.string().trim().min(1, "请输入工号").max(50),
  deptId: z.string().regex(/^\d+$/, "请选择部门"),
  roleIds: z.array(z.string()).min(1, "至少选择一个角色"),
  password: z
    .string()
    .optional()
    .refine(
      (value) => !value || (value.length >= 8 && value.length <= 64),
      "密码长度需在 8 到 64 个字符之间",
    ),
});

type CreateValues = z.infer<typeof createSchema>;

export function CreateUserModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const depts = useDepts();
  const roles = useAllRoles();
  const mutation = useCreateUserAccount();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      username: "",
      realName: "",
      employeeNo: "",
      deptId: "",
      roleIds: [],
      password: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      username: "",
      realName: "",
      employeeNo: "",
      deptId: "",
      roleIds: [],
      password: "",
    });
  }, [open, form]);

  async function submit(values: CreateValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync({
        username: values.username.trim(),
        realName: values.realName.trim(),
        employeeNo: values.employeeNo.trim(),
        deptId: values.deptId,
        roleIds: values.roleIds,
        password: values.password?.trim() || undefined,
      });
      message.success("账号已创建");
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "创建失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="新建账号"
      onCancel={onClose}
      okText="创建账号"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      width={640}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        账号信息与组织架构来自外部同步；这里只做受限建号并绑定角色。
      </p>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="username"
          label="用户名"
          required
        >
          {(field) => (
            <Input
              {...field}
              value={field.value ?? ""}
              maxLength={50}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="realName"
          label="真实姓名"
          required
        >
          {(field) => (
            <Input
              {...field}
              value={field.value ?? ""}
              maxLength={50}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="employeeNo"
          label="工号"
          required
        >
          {(field) => (
            <Input
              {...field}
              value={field.value ?? ""}
              maxLength={50}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="deptId"
          label="归属部门"
          required
        >
          {(field) => (
            <Select
              showSearch
              optionFilterProp="label"
              value={field.value || undefined}
              onChange={field.onChange}
              options={flattenDepts(depts.data ?? [])}
              loading={depts.isLoading}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
      </div>
      <FormField
        control={form.control}
        name="roleIds"
        label="绑定角色"
        required
      >
        {(field) => (
          <Select
            mode="multiple"
            value={field.value ?? []}
            onChange={field.onChange}
            options={(roles.data?.list ?? [])
              .filter((role) => role.code !== "super_admin")
              .map((role) => ({
                value: role.id,
                label: `${role.name}（${role.code}）`,
              }))}
            style={{ width: "100%" }}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="password"
        label="初始密码"
        extra="可选，8–64 个字符；留空则随机生成，账号走 SSO 或稍后重置。"
      >
        {(field) => (
          <Input.Password
            {...field}
            value={field.value ?? ""}
            maxLength={64}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}

// ---------- 分配角色 ----------

const rolesSchema = z.object({
  roleIds: z.array(z.string()),
});

type RolesValues = z.infer<typeof rolesSchema>;

export function AssignRolesModal({
  open,
  userId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  userId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const { user: currentUser, isSuperAdmin } = useAuth();
  const roles = useAllRoles();
  const user = useUser(open ? userId : null);
  const mutation = useAssignUserRoles();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RolesValues>({
    resolver: zodResolver(rolesSchema),
    defaultValues: { roleIds: [] },
  });

  useEffect(() => {
    if (open && user.data) {
      form.reset({ roleIds: user.data.roleIds });
    }
  }, [open, user.data, form]);

  async function submit(values: RolesValues) {
    if (!userId) return;
    setSubmitting(true);
    try {
      await mutation.mutateAsync({ id: userId, roleIds: values.roleIds });
      message.success("角色已更新");
      onSuccess();
      onClose();
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "保存失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="分配角色"
      onCancel={onClose}
      okText="保存角色"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        {user.data
          ? `账号：${user.data.realName}（${user.data.username}）`
          : "正在加载账号信息…"}
      </p>
      <FormField
        control={form.control}
        name="roleIds"
        label="角色"
        extra="留空表示清空该账号的全部角色。勾选「超级管理员」等同于设置超管；变更后目标账号需要重新登录，且不能取消自己的超管身份。"
      >
        {(field) => (
          <Select
            mode="multiple"
            value={field.value ?? []}
            onChange={field.onChange}
            options={(roles.data?.list ?? [])
              .filter((role) => isSuperAdmin || role.code !== "super_admin")
              .map((role) => ({
                value: role.id,
                label: `${role.name}（${role.code}）`,
                disabled:
                  role.code === "super_admin" &&
                  userId === currentUser?.id,
              }))}
            style={{ width: "100%" }}
          />
        )}
      </FormField>
    </Modal>
  );
}

// ---------- 重置密码 ----------

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "密码至少 8 个字符")
      .max(64, "密码最多 64 个字符"),
    confirm: z.string().min(1, "请再次输入新密码"),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "两次输入的密码不一致",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function ResetPasswordModal({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: User | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const mutation = useResetUserPassword();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    if (open) form.reset({ password: "", confirm: "" });
  }, [open, form]);

  async function submit(values: PasswordValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      await mutation.mutateAsync({ id: user.id, password: values.password });
      message.success("密码已重置，该账号已签发的令牌全部失效");
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "重置失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="重置密码"
      onCancel={onClose}
      okText="确认重置"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <p className="mb-4 text-sm text-ink-muted">
        {user ? `账号：${user.realName}（${user.username}）` : ""}
        <br />
        重置后该账号已签发的令牌会全部失效，需要重新登录。
      </p>
      {user?.authSource === "sso" ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title="统一认证账号"
          description="这里重置的是本地回退密码；下一次统一认证登录成功后会被 SSO 密码覆盖。"
        />
      ) : null}
      <FormField
        control={form.control}
        name="password"
        label="新密码"
        required
      >
        {(field) => (
          <Input.Password
            {...field}
            value={field.value ?? ""}
            maxLength={64}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="confirm"
        label="确认新密码"
        required
      >
        {(field) => (
          <Input.Password
            {...field}
            value={field.value ?? ""}
            maxLength={64}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
