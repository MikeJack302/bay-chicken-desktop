# 三维模型来源

这三个 GLB 来自中山文明网（广东省中山市精神文明建设办公室主办）公开的十五运会标识源文件资料包，未替换为自拟几何造型。档案中的模型没有骨骼和动画；桌宠动作由应用另外实现。

- 发布页：https://wenmingzs.zsnews.cn/Article/view/cateid/526/id/63556.html
- 源文件资料包：https://wenmingzs.zsnews.cn/Attachment/Files/2025/10/14/01.zip
- 规范手册包：https://wenmingzs.zsnews.cn/Attachment/Files/2025/10/14/00.zip
- 官方形象页：https://www.sport.gov.cn/n4/n29143600/n29165849/c29168151/content.html
- 设计说明：https://www.baygames.cn/node_0e9abf3fbd/cdcc8185e1.shtml

归档路径前缀：`01--会徽吉祥物主题口号源文件/全运会吉祥物三维文件（0529更新）/15运会-吉祥物-带贴图三维文件/`

| 本地文件 | 原始文件 |
| --- | --- |
| white.glb | 白海豚站立/白海豚站立.glb |
| white-wave.glb | 白海豚挥手/白海豚挥手.glb |
| pink.glb | 粉海豚/粉海豚.glb |

`scripts/fetch-models.py` 从公开 ZIP 的目录定位这些文件，通过 HTTP Range 取出并逐个校验 ZIP CRC；SHA-256 记录在 `research/model-provenance.json`。这里保留原始 GLB 二进制。应用加载时统一缩放、居中、重建平滑法线，为白色站立、粉色模型附加 11 根运行时控制骨骼；保留网格、UV、嵌入式贴图。原白色挥手文件作为来源素材保留，v0.2 的招手已由骨骼驱动，两种外观均可招手。

公开下载不代表获得商业授权。吉祥物及标识权利归相应权利人，使用范围以源站发布说明及官方规范为准；本地桌宠是非官方原型。
