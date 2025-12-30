# 网站安全检测工具 (Website Security Inspector)

一个基于 Next.js 构建的现代化网站安全检测工具，能够深入分析目标站点的 HTTP 协议支持、SSL/TLS 证书详情、连接耗时以及服务器地理位置等信息。

<img width="982" height="1654" alt="image" src="https://github.com/user-attachments/assets/38d2e163-a390-4452-9931-f7be1fff7aa4" />

## ✨ 主要功能

*   🔒 **SSL/TLS 深度分析**: 检测 TLS 版本、加密套件、证书有效期、颁发者及 HSTS 支持状态。
*   🌐 **协议支持检测**: 识别站点是否支持 HTTP/1.1, HTTP/2, HTTP/3 (QUIC)。
*   ⏱️ **连接耗时统计**: 精确展示 DNS 解析、TCP 连接、TLS 握手及 TTFB (首字节时间) 的耗时详情。
*   🌍 **服务器信息**: 解析服务器 IP 地址、地理位置（国家/地区/城市/ISP）及 CNAME 记录。
*   📝 **站点基础信息**: 自动提取目标站点的标题 (Title)、描述 (Meta Description) 及 Favicon 图标。
*   🌓 **暗色模式适配**: 完美支持明亮/暗黑模式切换，跟随系统主题。
*   🛡️ **安全防护**: 内置 API 接口限流机制，防止恶意请求。

## 🛠️ 技术栈

*   **框架**: [Next.js 15](https://nextjs.org/) (App Router)
*   **语言**: TypeScript
*   **样式**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **UI 组件**: [Shadcn UI](https://ui.shadcn.com/)
*   **图标**: [Lucide React](https://lucide.dev/)
*   **后端能力**: Node.js Native Modules (`tls`, `https`, `dns`, `http`)

## 🚀 快速开始

1.  **克隆项目**

    ```bash
    git clone https://github.com/afoim/eopf_web_test.git
    cd eopf_web_test
    ```

2.  **安装依赖**

    ```bash
    npm install
    # 或者
    pnpm install
    # 或者
    yarn install
    ```

3.  **启动开发服务器**

    ```bash
    npm run dev
    # 或者
    pnpm dev
    ```

4.  打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可使用。

## 📦 部署

本项目使用 Next.js 构建，支持部署在任何支持 Node.js 运行时的平台上（如 Vercel, EdgeOne Pages, Netlify 等）。

> **注意**: 由于本项目依赖 Node.js 的原生模块 (`tls`, `dns` 等) 进行网络探测，因此**不支持**纯 Edge Runtime 环境（除非平台提供 Node.js 兼容层）。

### 构建命令

```bash
npm run build
```

## 👤 作者

*   **GitHub**: [afoim](https://github.com/afoim)
*   **Bilibili**: [二叉树树](https://space.bilibili.com/325903362)
