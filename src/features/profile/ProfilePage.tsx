import { useState } from "react";
import { Alert, App, Button, Card, Descriptions, Input, Tag } from "antd";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "../../components/PageHeader";
import { FormField } from "../../components/FormField";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { changePasswordErrorMessage } from "../../lib/auth/messages";
import { changePassword } from "../../lib/api/endpoints/auth";
import { formatDateTime } from "../../lib/format";

const schema = z
  .object({
    oldPassword: z
      .string()
      .min(6, "密码至少 6 个字符")
      .max(72, "密码最多 72 个字符"),
    newPassword: z
      .string()
      .min(6, "密码至少 6 个字符")
      .max(72, "密码最多 72 个字符"),
    confirm: z.string().min(1, "请再次输入新密码"),
  })
  .refine((values) => values.newPassword === values.confirm, {
    path: ["confirm"],
    message: "两次输入的新密码不一致",
  });

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const { user, permissions, isSuperAdmin } = useAuth();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const isSso = user?.authSource === "sso";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: "", newPassword: "", confirm: "" },
  });

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success("密码已修改");
      form.reset();
    } catch (error) {
      if (error instanceof ApiError && error.code === 20105) {
        form.setError("oldPassword", {
          type: "server",
          message: "原密码错误",
        });
      } else if (!applyApiFieldErrors(error, form.setError)) {
        message.error(changePasswordErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="个人中心"
        description="查看当前账号信息与权限，并修改登录密码。"
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card title="账号信息">
          <Descriptions
            column={{ xs: 1, sm: 2 }}
            items={[
              {
                key: "username",
                label: "用户名",
                children: (
                  <span className="tabular">{user?.username ?? "—"}</span>
                ),
              },
              { key: "realName", label: "姓名", children: user?.realName ?? "—" },
              {
                key: "employeeNo",
                label: "工号",
                children: (
                  <span className="tabular">{user?.employeeNo ?? "—"}</span>
                ),
              },
              { key: "dept", label: "部门", children: user?.deptName ?? "—" },
              { key: "mobile", label: "手机号", children: user?.mobile ?? "—" },
              {
                key: "super",
                label: "账号类型",
                children: user?.isSuperAdmin ? "超级管理员" : "普通账号",
              },
              {
                key: "authSource",
                label: "账号来源",
                children: isSso ? (
                  <Tag color="blue" className="m-0">
                    统一认证
                  </Tag>
                ) : (
                  <Tag className="m-0">本地账号</Tag>
                ),
              },
              {
                key: "lastLogin",
                label: "最后登录",
                children: formatDateTime(user?.lastLoginAt),
              },
              {
                key: "createdAt",
                label: "创建时间",
                children: formatDateTime(user?.createdAt),
              },
            ]}
          />
        </Card>

        <Card title="当前权限">
          {isSuperAdmin ? (
            <div className="text-sm text-ink-muted">
              超级管理员：跳过全部权限码校验，但仍受数据范围上限约束。
            </div>
          ) : permissions.length ? (
            <div className="flex max-h-[280px] flex-wrap gap-1.5 overflow-auto">
              {permissions.map((code) => (
                <Tag key={code} className="tabular m-0 text-xs">
                  {code}
                </Tag>
              ))}
            </div>
          ) : (
            <div className="text-sm text-ink-muted">当前账号没有业务权限码。</div>
          )}
        </Card>
      </div>

      <Card
        title={isSso ? "密码管理" : "修改密码"}
        className="mt-4 max-w-[560px]"
      >
        {isSso ? (
          <Alert
            type="info"
            showIcon
            title="统一认证账号请在统一认证平台修改密码"
            description="本系统不保存统一认证密码。管理员重置的本地密码会在下一次统一认证登录成功时被覆盖。"
          />
        ) : (
          <form onSubmit={form.handleSubmit(submit)}>
          <FormField
            control={form.control}
            name="oldPassword"
            label="当前密码"
            required
          >
            {(field) => (
              <Input.Password
                {...field}
                value={field.value ?? ""}
                autoComplete="current-password"
                maxLength={72}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          </FormField>
          <FormField
            control={form.control}
            name="newPassword"
            label="新密码"
            required
            extra="6–72 个字符"
          >
            {(field) => (
              <Input.Password
                {...field}
                value={field.value ?? ""}
                autoComplete="new-password"
                maxLength={72}
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
                autoComplete="new-password"
                maxLength={72}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          </FormField>
          <Button type="primary" htmlType="submit" loading={submitting}>
            保存新密码
          </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
