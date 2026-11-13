import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Spin,
  Tooltip,
} from "antd";
import {
  BellOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useUnreadCount } from "../../features/messages/queries";
import { useMediaQuery } from "../../lib/useMediaQuery";
import {
  buildNavItems,
  isMentorLanding,
  ROUTE_LABELS,
  selectedMenuKey,
} from "./nav-items";

const { Header, Sider, Content } = Layout;

export function AppShell({ children }: { children: ReactNode }) {
  const {
    user,
    permissions,
    isSuperAdmin,
    loading,
    can,
    logout,
    loginNotice,
    dismissLoginNotice,
  } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const [collapsed, setCollapsed] = useState(isCompact);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = useMemo(
    () => buildNavItems(permissions, isSuperAdmin),
    [permissions, isSuperAdmin],
  );

  const unreadQuery = useUnreadCount(can("message:list"));

  const selectedKey = selectedMenuKey(pathname);
  const approvedMentor =
    can("mentor:slot-manage") || can("appointment:handle");
  const mentorLanding = isMentorLanding(permissions, isSuperAdmin);

  function labelFor(key: string): string | undefined {
    if (!approvedMentor && key === "/mentor") return "导师申请";
    if (!approvedMentor && key === "/mentor/profile") return "申请成为导师";
    return ROUTE_LABELS[key];
  }

  const crumbs = useMemo(() => {
    const items: { title: ReactNode }[] = [
      {
        title: mentorLanding ? (
          <Link to="/mentor">工作台</Link>
        ) : (
          <Link to="/">工作台</Link>
        ),
      },
    ];
    if (pathname === "/") return items;
    const label = labelFor(selectedKey);
    if (label) items.push({ title: label });
    const rest = pathname
      .slice(selectedKey === "/" ? 0 : selectedKey.length)
      .split("/")
      .filter(Boolean);
    if (rest.length) {
      items.push({ title: `#${rest[rest.length - 1]}` });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, selectedKey, approvedMentor, mentorLanding]);

  useEffect(() => {
    const label = labelFor(selectedKey);
    document.title = label
      ? `${label} · 长沙医学院创新创业导师管理平台`
      : "长沙医学院 · 创新创业导师管理平台";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, approvedMentor]);

  const userMenu = {
    items: [
      { key: "profile", icon: <UserOutlined />, label: "个人中心" },
      { key: "password", icon: <LockOutlined />, label: "修改密码" },
      { type: "divider" as const },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "退出登录",
        danger: true,
      },
    ],
    onClick: async ({ key }: { key: string }) => {
      if (key === "logout") {
        await logout();
        void navigate({ to: "/login" });
        return;
      }
      void navigate({ to: "/profile" });
    },
  };

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      onClick={({ key }) => {
        void navigate({ to: key as never });
        setDrawerOpen(false);
      }}
      style={{ background: "transparent", borderInlineEnd: "none" }}
    />
  );

  if (loading && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" description="正在加载账号信息…" />
      </div>
    );
  }

  return (
    <Layout className="min-h-screen">
      {!isMobile ? (
        <Sider
          theme="dark"
          width={232}
          collapsedWidth={64}
          collapsed={collapsed}
          trigger={null}
          className="sidebar-scroll"
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            overflow: "auto",
            background: "linear-gradient(180deg, #08213f 0%, #0f3561 100%)",
          }}
        >
          <Link
            to="/"
            className="flex h-16 items-center gap-2.5 px-4 no-underline"
            style={{
              color: "#ffffff",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
              <img
                src="/csmu-logo-96.png"
                alt=""
                aria-hidden="true"
                className="h-8 w-8"
              />
            </span>
            {!collapsed ? (
              <span className="min-w-0">
                <span
                  className="block truncate text-[11px] tracking-[0.14em]"
                  style={{ color: "rgba(255,255,255,0.62)" }}
                >
                  长沙医学院
                </span>
                <span
                  className="block truncate text-[13px] font-medium"
                  style={{ color: "#ffffff" }}
                >
                  创新创业导师管理平台
                </span>
              </span>
            ) : null}
          </Link>
          <div className="pb-4">{menu}</div>
        </Sider>
      ) : null}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="left"
        size={232}
        closable={false}
        className="sidebar-scroll"
        styles={{
          body: {
            padding: 0,
            background: "linear-gradient(180deg, #08213f 0%, #0f3561 100%)",
          },
        }}
      >
        <Link
          to="/"
          className="flex h-16 items-center gap-2.5 px-4 no-underline"
          style={{
            color: "#ffffff",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
            <img
              src="/csmu-logo-96.png"
              alt=""
              aria-hidden="true"
              className="h-8 w-8"
            />
          </span>
          <span>
            <span
              className="block text-[11px] tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.62)" }}
            >
              长沙医学院
            </span>
            <span
              className="block text-[13px] font-medium"
              style={{ color: "#ffffff" }}
            >
              创新创业导师管理平台
            </span>
          </span>
        </Link>
        {menu}
      </Drawer>

      <Layout>
        <Header className="flex items-center gap-3 border-b border-line bg-white px-4 md:px-6">
          <Button
            type="text"
            aria-label="切换导航"
            icon={
              isMobile ? (
                <MenuOutlined />
              ) : collapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={() =>
              isMobile ? setDrawerOpen(true) : setCollapsed((prev) => !prev)
            }
          />
          <Breadcrumb items={crumbs} className="hidden sm:block" />
          <span className="truncate text-sm font-medium text-ink sm:hidden">
            {labelFor(selectedKey) ?? ""}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {can("message:list") ? (
              <Tooltip title="消息中心">
                <Badge
                  count={unreadQuery.data?.unread ?? 0}
                  size="small"
                  offset={[-2, 2]}
                >
                  <Button
                    type="text"
                    aria-label="消息中心"
                    icon={<BellOutlined />}
                    onClick={() => void navigate({ to: "/messages" })}
                  />
                </Badge>
              </Tooltip>
            ) : null}
            <Dropdown menu={userMenu} trigger={["click"]}>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1 hover:bg-muted"
              >
                <Avatar size={28} style={{ background: "#135591" }}>
                  {user?.realName?.slice(0, 1) ?? "管"}
                </Avatar>
                <span className="hidden text-sm text-ink md:inline">
                  {user?.realName ?? "未登录"}
                </span>
              </button>
            </Dropdown>
          </div>
        </Header>
        <Content className="min-w-0 p-6 max-md:p-4">
          {loginNotice?.ssoUnavailable ? (
            <Alert
              type="warning"
              showIcon
              banner
              closable
              className="mb-4"
              title="统一认证暂不可用，已使用本地密码登录"
              onClose={() => dismissLoginNotice("ssoUnavailable")}
            />
          ) : null}
          {loginNotice?.isDefaultPwd ? (
            <Alert
              type="warning"
              showIcon
              banner
              closable
              className="mb-4"
              title="你仍在使用初始密码，请尽快到统一认证平台修改"
              onClose={() => dismissLoginNotice("isDefaultPwd")}
            />
          ) : null}
          <div className="page-enter">{children}</div>
          <footer className="mt-10 border-t border-line pt-4 text-center text-[11px] tracking-wide text-ink-muted">
            长沙医学院创新创业学院 · 创新创业导师管理平台
          </footer>
        </Content>
      </Layout>
    </Layout>
  );
}
