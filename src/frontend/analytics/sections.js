import {
  ApiOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  RetweetOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from "@ant-design/icons-vue";

const traffic = [
  ["requests", "HTTP 请求", GlobalOutlined],
  ["encryption", "加密流量", SafetyCertificateOutlined],
  ["cache", "缓存", DatabaseOutlined],
  ["errors", "HTTP 错误", WarningOutlined],
  ["audience", "设备与地区", GlobalOutlined],
  ["2xx", "2xx 成功", CheckCircleOutlined],
  ["3xx", "3xx 重定向", RetweetOutlined],
  ["versions", "协议与内容", CloudServerOutlined],
  ["rankings", "HTTP 请求排行", BarChartOutlined],
];
const services = [
  ["security", "安全事件", SafetyCertificateOutlined],
  ["dns", "DNS 查询", ApiOutlined],
  ["network", "性能与网络", DashboardOutlined],
  ["endpoints", "API Gateway", ApiOutlined],
];

export function dashboardSections(zone) {
  const id = zone ? "site-" + zone.name.toLowerCase() : "overview";
  const sections = zone
    ? [...traffic, ["logs", "HTTP 日志排行", BarChartOutlined], ...services]
    : [...traffic, ...services, ["products", "Cloudflare 产品", ThunderboltOutlined]];
  return {
    id,
    title: zone?.name ?? "概览",
    sections: sections.map(([key, title, icon]) => ({ id: id + "-" + key, title, icon })),
  };
}
