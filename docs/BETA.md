# 湾湾大湾鸡 Beta 使用说明

Mac 公开测试版为 `0.9.0-beta`，支持 macOS 13+。Windows 公开测试版为 `0.8.0-beta.1`。非官方个人作品。

## 下载与启动

[选择所有历史版本](DOWNLOADS.md) · [macOS 安装、菜单栏与触控板操作](MACOS.md)


Windows 用户可在 [Beta 发布页](https://github.com/MikeJack302/bay-chicken-desktop/releases/tag/v0.8.0-beta.1) 下载 `BayChicken-Beta-0.8.0-beta.1-x64.exe`，双击运行。Mac 用户按 [macOS 说明](MACOS.md) 选择 DMG 或 ZIP。模型已包含在安装包中，不需要 Node.js 或 API Key 即可玩动作和使用提醒。Windows 便携 EXE 首次启动有解包过程。

这是预发布 Beta；[v0.7.0 稳定版](https://github.com/MikeJack302/bay-chicken-desktop/releases/tag/v0.7.0) 继续提供。Beta 使用 `%APPDATA%\bay-chicken-beta`，不覆盖稳定版和之前的试验版。首次启动只读取稳定版的名字、颜色、大小，不复制聊天记录或密钥。便携 EXE 的设置仍保存在本机用户目录。

## 轻提醒

点桌宠底部 **… → 设置 → 轻提醒**：

1. 勾选喝水、起身活动、放松眼睛，或填写自定义内容；每项间隔为 1–240 分钟。
2. 点 **保存提醒**；这只保存提醒选项，不需要修改聊天或其他设置。
3. **试播**可预览当前文字，不会自动开启定时。
4. 弹出后可选 **知道啦** 或 **5 分钟后再说**；也可在设置中暂停所有提醒。

提醒默认关闭。程序运行且桌宠可见时计时并显示卡片，忙于互动、隐藏或暂停时稍后显示，不打断正在做的动作。提醒可在趴边时显示，20 秒后自动收起。关闭程序后不计时；重启、电脑唤醒或恢复暂停后按新的间隔计时，不连续补发历史提醒。计时和文字保存在本机，不需要网络。

## 玩偶操作

- 左键拖动搬家，轻点不同部位触发随机互动；右键拖动旋转，支持 360°、俯视与仰视。
- 滚轮缩放，双击或按 R 回正视角。改名、提醒设置与趴边不改变已保存的大小。
- **互动 → 动作与玩具**中有糖葫芦、球、风车、网球，以及 Beta 的举杠铃、弹簧连跳、舞狮和蹲姿试作。
- 点坐下会找小凳子；拖至屏幕可用边缘可趴边，拖走离开。
- Beta 在 Windows 使用托盘、在 macOS 使用菜单栏图标显示/隐藏，可从相应菜单或设置退出。Mac 触控板也可按住 Option 用左键拖动旋转。Beta 不注册 F8 或 Ctrl+Alt+B，可与稳定版一起使用。

腿脚使用新建的连续三维网格，头、躯干、胸前图案沿用原始模型。招手、跳舞、吃糖葫芦、举重、睡觉等有不同表情。原始资料及来源见 [模型说明](../assets/models/SOURCE.md)。Oi、劈腿蹲等仍为试作，未声称复刻原视频。

## 构建和验证

```powershell
pnpm install
pnpm test
pnpm beta
node scripts/verify-release-bundle.cjs
node scripts/reminders-smoke.cjs
```

构建产物位于 `release/beta/`。提醒实测使用隔离配置，真实等待一分钟，验证自动触发、延后、暂停、自定义文字与趴边可见性。

本版本在 Windows 11 x64 验证，未做代码签名。完整历史见 [CHANGELOG](../CHANGELOG.md)，模型与第三方说明见 [NOTICE](../NOTICE.md)。
