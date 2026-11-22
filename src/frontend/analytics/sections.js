import {
  ApiOutlined,
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
  ["errors", "错误率", WarningOutlined],
  ["2xx", "2xx 成功", CheckCircleOutlined],
  ["3xx", "3xx 重定向", RetweetOutlined],
  ["versions", "HTTP 版本", CloudServerOutlined],
  ["cache", "缓存命中率", DatabaseOutlined],
  ["security", "安全事件", SafetyCertificateOutlined],
  ["audience", "访问与地区", GlobalOutlined],
  ["dns", "DNS 查询", ApiOutlined],
  ["network", "性能与网络", DashboardOutlined],
  ["endpoints", "API Gateway", ApiOutlined],
];

export function dashboardSections(zone) {
  const id = zone ? "site-" + zone.name.toLowerCase() : "overview";
  const sections = zone ? traffic : [...traffic, ["products", "Cloudflare 产品", ThunderboltOutlined]];
  return {
    id,
    title: zone?.name ?? "概览",
    sections: sections.map(([key, title, icon]) => ({ id: id + "-" + key, title, icon })),
  };
}
