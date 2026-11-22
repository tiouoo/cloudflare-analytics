import {
  ApiOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons-vue";

export const sections = [
  { id: "overview", title: "概览", icon: AppstoreOutlined, panels: ["requests", "visits", "trend"] },
  { id: "http", title: "HTTP 流量", icon: GlobalOutlined, panels: ["requests", "visits", "trend", "countries", "status-codes", "api-requests"] },
  { id: "cache", title: "缓存", icon: DatabaseOutlined, panels: ["cache"] },
  { id: "security", title: "安全事件", icon: SafetyCertificateOutlined, panels: ["security"] },
  { id: "dns", title: "DNS 分析", icon: ApiOutlined, panels: ["dns"] },
  { id: "workers", title: "Workers", icon: ThunderboltOutlined, panels: ["workers"], accountWide: true },
  { id: "performance", title: "性能", icon: DashboardOutlined, panels: ["performance"] },
  { id: "infrastructure", title: "基础设施", icon: CloudServerOutlined, panels: ["infrastructure"] },
];

export function currentSection(view) {
  return sections.find(({ id }) => id === view) ?? sections[0];
}
