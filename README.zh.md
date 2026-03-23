# OpenClaw 安全审计工具包

[![npm version](https://img.shields.io/npm/v/@effectorhq/security-audit.svg?style=flat-square)](https://www.npmjs.com/package/@effectorhq/security-audit)
[![CI Status](https://img.shields.io/github/actions/workflow/status/effectorHQ/security-toolkit/ci.yml?style=flat-square)](https://github.com/effectorHQ/security-toolkit/actions)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-green?style=flat-square)](https://nodejs.org/)

[English Documentation](./README.md)

## 问题描述

OpenClaw 在公网上有超过 **13.5 万个暴露的实例**。这些实例中的大多数都使用默认配置或不安全配置运行，给整个生态系统带来严重的安全隐患。常见的错误配置包括：

- 网关服务监听在 `0.0.0.0` 而不是 `127.0.0.1`
- 禁用了身份验证或使用默认凭证
- 在配置文件中硬编码 API 密钥
- 未配置 TLS/SSL 加密
- Webhook 端点缺少签名验证
- 审计日志记录不足

## 该工具的功能

OpenClaw 安全审计工具包是一个综合性的命令行扫描器，可自动检测和报告 OpenClaw 实例中常见的安全错误配置。它分析以下内容：

- **网关配置**：验证网络绑定、端口暴露和协议设置
- **身份验证**：验证身份验证机制是否正确配置
- **API 密钥管理**：检测硬编码的凭证并强制使用环境变量
- **TLS/SSL**：确保所有通信通道都启用加密
- **Webhook 安全**：验证 Webhook 端点的签名验证
- **会话管理**：检查超时配置
- **审计日志**：确保启用全面的日志记录

结果按严重级别（CRITICAL、HIGH、MEDIUM、LOW）分类，帮助您优先修复问题。

## 快速开始

### 安装

```bash
npm install -g @effectorhq/security-audit
```

或使用 npx（无需安装）：

```bash
npx @effectorhq/security-audit scan
```

### 基本扫描

对您的 OpenClaw 配置运行完整的安全审计：

```bash
openclaw-audit scan /path/to/gateway.yaml
```

### 生成报告

生成多种格式的详细安全报告：

```bash
# 终端输出（彩色）
openclaw-audit report /path/to/gateway.yaml --format text

# JSON 格式用于编程处理
openclaw-audit report /path/to/gateway.yaml --format json

# Markdown 格式用于文档
openclaw-audit report /path/to/gateway.yaml --format markdown
```

### 运行特定检查

执行单个安全检查：

```bash
openclaw-audit check gateway-exposure /path/to/gateway.yaml
openclaw-audit check auth-missing /path/to/gateway.yaml
openclaw-audit check api-key-in-config /path/to/gateway.yaml
```

## 示例输出

```
OpenClaw 安全审计扫描结果
======================

配置文件: /etc/openclaw/gateway.yaml
扫描时间: 2026-03-05T10:30:00Z

严重问题 (2)
-----------
✗ 网关暴露 (gateway-exposure)
  网关正在监听 0.0.0.0。这会将服务暴露给所有网络接口。
  位置: gateway.yaml:12 - bind_address: 0.0.0.0
  建议: 改为 127.0.0.1 或特定的内部 IP 地址

✗ 身份验证缺失 (auth-missing)
  未配置身份验证机制。所有请求都在未验证的情况下处理。
  位置: gateway.yaml:45 - auth: disabled
  建议: 启用身份验证并配置用户凭证

高风险问题 (3)
-------------
⚠ 配置中的 API 密钥 (api-key-in-config)
  API 密钥被硬编码在配置文件中。凭证应使用环境变量。
  位置: gateway.yaml:78 - api_key: sk_live_aBc...
  建议: 移至环境变量：export OPENCLAW_API_KEY=...

⚠ TLS 禁用 (tls-disabled)
  未为网关配置 TLS/SSL 加密。所有流量都是未加密的。
  位置: gateway.yaml:52
  建议: 启用 TLS 并使用有效证书

⚠ 默认端口 (default-port)
  网关使用默认端口 18789 而没有防火墙保护。
  位置: gateway.yaml:8 - port: 18789
  建议: 配置防火墙规则或更改为非标准端口

中等风险问题 (1)
--------------
ℹ Webhook 验证 (webhook-validation)
  Webhook 端点未验证请求签名。
  位置: gateway.yaml:95
  建议: 启用 webhook 签名验证

总结
----
问题总数: 6
  严重: 2 | 高: 3 | 中: 1 | 低: 0
状态: 失败 - 严重问题必须修复

修复优先级:
1. 启用身份验证
2. 更改网关绑定地址
3. 移除硬编码的 API 密钥
4. 启用 TLS 加密
5. 配置防火墙规则
```

## 可用检查

| 检查名称 | 严重级别 | 描述 |
|--------|---------|------|
| `gateway-exposure` | CRITICAL | 检测网关是否监听 0.0.0.0 |
| `auth-missing` | CRITICAL | 验证身份验证是否已配置 |
| `api-key-in-config` | HIGH | 检测配置中硬编码的 API 密钥 |
| `tls-disabled` | HIGH | 检查是否启用了 TLS/SSL 加密 |
| `default-port` | HIGH | 警告使用默认端口 18789 且无防火墙 |
| `webhook-validation` | MEDIUM | 验证 webhook 签名验证 |
| `session-timeout` | MEDIUM | 检查会话超时配置 |
| `logging-config` | LOW | 验证审计日志是否启用 |

## 配置

在项目根目录创建 `.openclaw-audit.json` 文件来自定义扫描行为：

```json
{
  "configPath": "/etc/openclaw/gateway.yaml",
  "severity": "HIGH",
  "checks": ["gateway-exposure", "auth-missing", "api-key-in-config"],
  "excludeChecks": ["logging-config"],
  "strict": true
}
```

## 退出代码

- `0`: 扫描成功完成，无严重问题
- `1`: 扫描完成，发现严重或高风险问题
- `2`: 扫描失败，配置错误
- `3`: 文件未找到或无法读取

## 安全考虑

该工具执行配置文件的**只读**分析。它不会：
- 修改配置文件
- 与您的 OpenClaw 实例建立网络连接
- 存储或传输您的配置数据
- 要求身份验证凭证

请始终审查该工具的源代码，并在对配置文件具有受限访问权限的安全环境中运行。

## 贡献

我们欢迎安全研究人员和社区贡献。如果您发现额外的错误配置或加固策略，请在 [GitHub](https://github.com/effectorHQ/security-toolkit) 上提交问题或拉取请求。

**安全提示**：对于 OpenClaw 本身中的安全漏洞（不是本工具），请直接向 OpenClaw 安全团队报告，而不是提交公开问题。

## 许可证

This project is currently licensed under the [Apache License, Version 2.0](LICENSE.md) 。

## 资源

- [OpenClaw 加固指南](./docs/hardening-guide.md)
- [OpenClaw 文档](https://github.com/effectorHQ)
- [OWASP 配置安全检查清单](https://owasp.org)
