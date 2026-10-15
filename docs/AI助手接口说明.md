# 小锂 · AI 助手接口说明

> 面向开发者 / 参赛材料的技术说明。**默认不需要任何接口**：助手开箱即用
> 站内知识库检索（`src/services/aiAssistant.js` + `src/data/assistantCorpus.js`），
> 断网也能回答。以下接口是**可选增强**——接上之后，由大模型负责组织语言，
> 检索到的资料仍然来自站内语料（轻量 RAG：检索在本地，生成在远端）。

## 一、行为模式

| 模式 | 触发条件 | 表现 |
|---|---|---|
| 本地检索 | 未配置远程接口（默认） | 站内知识库打分检索，返回条目正文 + 章节出处 |
| 远程生成 | 配置完整且请求成功 | 检索结果注入 system 上下文，由大模型作答 |
| 自动回落 | 远程超时 / 断网 / 4xx-5xx | 无感切回本地答案，并在回答末尾标注"远端暂不可用" |

## 二、配置方式（Vite 环境变量）

在项目根目录建 `.env`（参照 `.env.example`）：

```ini
VITE_AI_API_BASE=https://your-proxy.example.com   # 必填，末尾不带斜杠；拼 /chat/completions
VITE_AI_API_KEY=sk-xxxx                            # 必填
VITE_AI_MODEL=your-model-name                      # 选填，服务端有默认模型可不填
VITE_AI_TIMEOUT=12000                              # 选填，毫秒，默认 12000
```

任一项缺失即视为"未配置"，走本地检索。

## 三、接口契约（OpenAI 兼容）

`POST {VITE_AI_API_BASE}/chat/completions`

请求头：

```
Content-Type: application/json
Authorization: Bearer {VITE_AI_API_KEY}
```

请求体：

```json
{
  "model": "your-model-name",
  "temperature": 0.2,
  "messages": [
    { "role": "system", "content": "你是电池科普作品 BatteryScope 的站内学习助手\"小锂\"……（固定系统提示）" },
    { "role": "system", "content": "资料：\n【04 老化】SEI 膜是什么？为什么会一直变厚？\n……（本地检索 top3 条目）" },
    { "role": "user", "content": "学习者的问题原文" }
  ]
}
```

响应：读取 `choices[0].message.content`（标准 OpenAI 结构）。

## 四、⚠️ 安全提醒（必读）

静态站点没有后端，**写进 `.env` 的 Key 会随 JS bundle 暴露给所有访客**。
生产环境请二选一：

1. **推荐**：自建一个同源代理（任意语言，几行即可），由代理持有 Key 并转发
   `/chat/completions`；站点侧只配 `VITE_AI_API_BASE=/api`。
2. 或使用限额 / 过期的演示 Key，并接受被盗用风险。

本站为纯前端静态架构，此代理不随作品交付；比赛演示用本地检索模式即可完整闭环。

## 五、如果要接，需要你提供

- 一个 OpenAI 兼容的 `base URL`（或上述同源代理地址）；
- API Key；
- 模型名（可选）；
- 若用代理：确认代理已处理 CORS（允许本站域名）与速率限制。

把以上信息给我，我改 `.env` 即可上线；不提供也完全不影响作品运行。

## 六、代码位置

| 文件 | 职责 |
|---|---|
| `src/data/assistantCorpus.js` | 知识库语料（只收本站讲过内容）+ 同义词表 |
| `src/services/aiAssistant.js` | 分词 / 检索打分 / 远程请求 / 本地答案组装 |
| `src/services/assistantBus.js` | 主动讲解事件总线（答错题、游戏失误时触发） |
| `src/components/RobotAssistant.vue` | 悬浮球 + 对话面板 + 主动气泡 |
| `src/components/RobotFace.vue` | 机器人形象 SVG（idle / happy / concern / think 四态） |
