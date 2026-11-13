import type { ThemeConfig } from "antd";

const fontFamily =
  '"Noto Sans SC", "HarmonyOS Sans SC", "Source Han Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

/**
 * 全局 antd 主题：明亮、克制的浅色管理平台。
 * 颜色令牌与长沙医学院创新创业学院视觉标识对齐，并与 src/index.css 的 @theme 保持一致。
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#135591",
    colorInfo: "#135591",
    colorLink: "#135591",
    colorSuccess: "#0b8f87",
    colorWarning: "#d97706",
    colorError: "#c62828",
    colorTextBase: "#1b2a3a",
    colorText: "#1b2a3a",
    colorTextSecondary: "#5b6b7d",
    colorBgLayout: "#f4f8fc",
    colorBgContainer: "#ffffff",
    colorBorder: "#dbe7f3",
    colorBorderSecondary: "#eaf1f8",
    borderRadius: 4,
    fontSize: 14,
    fontFamily,
    fontWeightStrong: 500,
    lineHeight: 1.6,
    controlHeight: 34,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      headerHeight: 56,
      siderBg: "#0a2a4f",
      bodyBg: "#f4f8fc",
      headerPadding: "0 24px",
    },
    Menu: {
      darkItemBg: "#0a2a4f",
      darkSubMenuItemBg: "#082340",
      darkItemColor: "rgba(255,255,255,0.76)",
      darkItemHoverBg: "rgba(255,255,255,0.1)",
      darkItemSelectedBg: "#135591",
      darkItemSelectedColor: "#ffffff",
      groupTitleColor: "rgba(255,255,255,0.58)",
      groupTitleFontSize: 12,
      itemHeight: 40,
      itemMarginInline: 8,
      itemBorderRadius: 4,
    },
    Table: {
      headerBg: "#f2f7fc",
      headerColor: "#5b6b7d",
      headerSplitColor: "#dbe7f3",
      rowHoverBg: "#f7fbff",
      cellPaddingBlock: 12,
      cellPaddingInline: 12,
      borderColor: "#eaf1f8",
    },
    Card: {
      paddingLG: 20,
      headerFontSize: 15,
      headerHeight: 48,
    },
    Descriptions: {
      labelBg: "#f4f8fc",
      titleMarginBottom: 12,
    },
    Tabs: {
      titleFontSize: 14,
      horizontalItemPadding: "10px 0",
    },
    Button: {
      controlHeight: 34,
      fontWeight: 500,
    },
    Input: {
      controlHeight: 34,
    },
    Select: {
      controlHeight: 34,
    },
    Modal: {
      titleFontSize: 16,
    },
    Form: {
      labelColor: "#46586b",
      verticalLabelPadding: "0 0 4px",
    },
  },
};
