import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Alert, Button, Input } from "antd";
import {
  BarChartOutlined,
  BulbOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../lib/auth/AuthProvider";
import { getTokens } from "../lib/auth/token-store";
import { loginErrorMessage } from "../lib/auth/messages";
import { FormField } from "../components/FormField";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (getTokens()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

const schema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

type FormValues = z.infer<typeof schema>;

const FEATURES = [
  {
    icon: <SafetyCertificateOutlined />,
    title: "两级审核",
    text: "二级学院初审、创新创业学院终审，审核过程全程留痕。",
  },
  {
    icon: <BarChartOutlined />,
    title: "数据台账",
    text: "导师、预约、指导与考核数据统一归集，支持统计导出。",
  },
  {
    icon: <BulbOutlined />,
    title: "协同育人",
    text: "连接导师资源与学生创新实践，服务医学人才培养。",
  },
];

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "登录 · 长沙医学院创新创业导师管理平台";
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.username.trim(), values.password);
      await navigate({ to: "/" });
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.15fr_1fr]">
      <aside
        className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex"
        style={{
          background:
            "linear-gradient(150deg, #071c35 0%, #0e3461 52%, #135591 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #2e59a7 0, transparent 40%), radial-gradient(circle at 85% 75%, #0b8f87 0, transparent 42%), linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "auto, auto, 48px 48px, 48px 48px",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
              <img
                src="/csmu-logo-96.png"
                alt="长沙医学院校徽"
                className="h-11 w-11"
              />
            </span>
            <div>
              <div className="text-base font-medium tracking-wide">
                长沙医学院
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                Changsha Medical University
              </div>
            </div>
          </div>
          <div className="mt-16 text-[12px] tracking-[0.32em] text-white/55">
            创新创业学院
          </div>
          <h1 className="font-display mt-4 max-w-[520px] text-[44px] leading-[1.28] font-medium tracking-[0.08em]">
            厚德博学
            <br />
            储能求真
          </h1>
          <span
            aria-hidden
            className="mt-6 block h-px w-14 bg-gold/80"
          />
          <p className="mt-6 max-w-[460px] text-[15px] leading-7 text-white/75">
            创新创业导师管理平台覆盖导师入驻、预约指导、过程记录、考核评价与归档统计，
            服务学校创新创业教育全流程。
          </p>
          <div className="mt-9 grid max-w-[520px] gap-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-base text-teal">
                  {feature.icon}
                </span>
                <div>
                  <div className="text-sm font-medium">{feature.title}</div>
                  <div className="text-[13px] leading-6 text-white/65">
                    {feature.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs tracking-wide text-white/50">
          长沙医学院创新创业学院 · 创新创业导师管理平台
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                <img
                  src="/csmu-logo-96.png"
                  alt="长沙医学院校徽"
                  className="h-9 w-9"
                />
              </span>
              <div>
                <div className="text-sm font-medium tracking-wide text-ink">
                  长沙医学院
                </div>
                <div className="text-[11px] tracking-wide text-ink-muted">
                  创新创业导师管理平台
                </div>
              </div>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="m-0 text-2xl font-medium tracking-tight text-ink">
              登录导师管理平台
            </h2>
            <p className="mt-1.5 mb-0 text-sm text-ink-muted">
              管理员使用平台管理账号登录；导师与学生使用学校统一身份认证账号。
            </p>
          </div>

          {error ? (
            <Alert
              type="error"
              showIcon
              title={error}
              className="mb-4"
              closable
              onClose={() => setError(null)}
            />
          ) : null}

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FormField
              control={form.control}
              name="username"
              label="用户名 / 工号"
              required
            >
              {(field) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  size="large"
                  autoComplete="username"
                  prefix={<UserOutlined className="text-slate-400" />}
                  placeholder="请输入用户名"
                  onChange={(event) => field.onChange(event.target.value)}
                />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="password"
              label="密码"
              required
            >
              {(field) => (
                <Input.Password
                  {...field}
                  value={field.value ?? ""}
                  size="large"
                  autoComplete="current-password"
                  prefix={<LockOutlined className="text-slate-400" />}
                  placeholder="请输入密码"
                  onChange={(event) => field.onChange(event.target.value)}
                />
              )}
            </FormField>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
              className="mt-2"
            >
              登录
            </Button>
          </form>

          <p className="mt-6 mb-0 text-center text-xs text-ink-muted">
            如忘记密码，请联系创新创业学院系统管理员重置。
          </p>
        </div>
      </main>
    </div>
  );
}
