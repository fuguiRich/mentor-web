import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Result, Spin } from "antd";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { useAuth } from "../lib/auth/AuthProvider";
import {
  isAdminLanding,
  isMentorLanding,
} from "../components/layout/nav-items";

export const Route = createFileRoute("/_app/")({
  component: LandingPage,
});

function LandingPage() {
  const { loading, isSuperAdmin, permissions } = useAuth();
  const navigate = useNavigate();

  const isAdmin = isAdminLanding(permissions, isSuperAdmin);
  const isMentor = isMentorLanding(permissions, isSuperAdmin);

  useEffect(() => {
    if (!loading && !isAdmin && isMentor) {
      void navigate({ to: "/mentor", replace: true });
    }
  }, [loading, isAdmin, isMentor, navigate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin description="正在加载账号信息…" />
      </div>
    );
  }

  if (isAdmin) return <DashboardPage />;

  if (isMentor) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin description="正在进入导师工作台…" />
      </div>
    );
  }

  return (
    <Result
      status="403"
      title="当前账号暂无平台访问权限"
      subTitle="学生账号请使用学生端；如需导师或管理权限，请联系创新创业学院管理员。"
    />
  );
}
