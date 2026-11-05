# 湾湾 · 大湾鸡三维桌宠

一只可以放在桌面上、摸摸头、转着看、陪你互动的三维桌宠。支持白色与粉色，也能给它起名字。非官方个人作品。

**[选择版本下载](docs/DOWNLOADS.md)** · [全部发行版](https://github.com/MikeJack302/bay-chicken-desktop/releases) · [使用说明](docs/BETA.md) · [macOS 说明](docs/MACOS.md)

## 版本

- **v0.7.0 稳定版**：改名、网球、屏幕趴边及日常玩具。
- **v0.8.0-beta.1**：新增立体腿脚、举杠铃、连跳、动作表情和本地轻提醒。
- **v0.8.0-beta.2**：macOS Apple Silicon / Intel 内测版本，尚未公开发布。

从 v0.6.0 起，各版本独立保留安装包，可以按版本下载和回退。旧版本不会被新版本覆盖。

## 功能与操作

- 左键搬家，右键旋转，滚轮缩放，双击回正；不同部位有随机互动。
- 找凳子坐、吃糖葫芦、玩球、吹风车、打网球，或趴在屏幕边缘陪你。
- Beta 提供举重、弓步、连跳与分阶段表情。
- **… → 设置 → 轻提醒**：喝水、活动、放松眼睛和自定义内容，可设置间隔、暂停或延后 5 分钟。

动作和提醒不需要 API Key。提醒只在应用运行时工作；隐藏、暂停或忙于互动时稍后提醒，重启和电脑唤醒后重新计时。

Windows 使用托盘，macOS 使用菜单栏图标显示、隐藏或退出。稳定版与 Beta 配置独立，升级不重置保存的外观设置。

## 源码与构建

`main` 保留稳定版应用代码；Beta 源码在 [`release/beta-0.8`](https://github.com/MikeJack302/bay-chicken-desktop/tree/release/beta-0.8) 分支。构建 Beta 请先切换到该分支，安装依赖后运行 `pnpm test` 和 `pnpm beta`；macOS 构建见对应说明。

[版本记录](CHANGELOG.md) · [模型来源](assets/models/SOURCE.md) · [第三方说明](NOTICE.md)
