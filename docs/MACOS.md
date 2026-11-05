# macOS 使用与构建

支持 macOS 13 Ventura 及以上，分别提供 Apple Silicon `arm64` 和 Intel `x64` 安装包。系统要求依据 [Electron 45.1.0 平台支持](https://github.com/electron/electron/blob/v45.1.0/README.md#platform-support)。

## 选择安装包

当前 v0.8.0-beta.2 为内部测试构建，安装包只存于本地和 GitHub 草稿，尚未公开发布。正式开放下载时会加入 [版本下载页](DOWNLOADS.md)。

点苹果菜单 →“关于本机”查看机型：显示“芯片 Apple M…”请选择 `mac-arm64`；显示“处理器 Intel…”请选择 `mac-x64`。

打开 DMG 后把应用拖到“应用程序”；ZIP 为相同应用的压缩版本。首次运行请在应用程序中打开。程序运行后，菜单栏会显示图标，可用于显示、隐藏、设置和退出。

当前 Beta 采用 ad-hoc 本地签名，没有 Apple Developer ID 公证。如果系统阻止首次打开，请先确认下载来源和 SHA-256，再按 [Apple 官方说明](https://support.apple.com/en-us/102445)，在“系统设置 → 隐私与安全”中确认是否允许打开。无需关闭系统的 Gatekeeper。

## 操作

- 左键拖动移动；右键拖动旋转。触控板也可按住 **Option** 后用左键拖动旋转。
- 滚轮缩放，双击回正。菜单栏图标可找回桌宠或打开设置。
- 提醒入口为 **… → 设置 → 轻提醒**，支持喝水、起身活动、放松眼睛、自定义间隔、暂停和延后。
- 配置位于 `~/Library/Application Support/bay-chicken-beta/`，退出后保留。
- 使用系统可用桌面范围进行边缘吸附；菜单栏和 Dock 占用的空间由系统工作区决定。

## 本机构建

在 `release/beta-0.8` 分支，使用 Node.js 24 和 pnpm：

```sh
pnpm install --frozen-lockfile --ignore-scripts
node node_modules/electron/install.js
pnpm test
pnpm run build
pnpm exec electron-builder --config electron-builder.macos.yml --mac --arm64 --publish never
node scripts/verify-release-bundle.cjs
```

Intel Mac 把 `--arm64` 换为 `--x64`。产物位于 `release/macos/`。仓库的构建工作流在相应原生 Mac 环境中执行打包、签名完整性检查、程序启动、模型交互和真实计时提醒验证。
