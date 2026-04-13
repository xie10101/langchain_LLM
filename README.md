# LangChain.js 学习项目

这是我的 LangChain.js 框架学习记录项目，通过实践掌握大语言模型应用开发的核心概念。

## 学习动机

LangChain 是一个用于构建 LLM（大语言模型）应用的强大框架，它提供了标准化的接口来连接不同的模型提供商，并支持复杂的工作流编排。

## 核心技术点

### 1. 基础模型调用 (`invoke`)
- 单条消息的同步调用
- 获取完整的模型响应
- 支持参数配置（temperature、model 等）

### 2. 批处理 (`batch`)
- 并发处理多条独立请求
- **注意**：batch 请求之间是独立的，不保留上下文记忆
- 适用于需要同时处理多条无关联消息的场景

### 3. 流式输出 (`stream`)
- 使用 `for await...of` 语法实时接收模型生成的内容
- **异步迭代**：边产生边消费，无需等待完整响应
- 提升用户体验，实现打字机效果

### 4. 记忆与会话
- 理解 `RunnableWithMessageHistory` 的作用
- Session 管理实现上下文关联

## 参考资源

### 视频教程
📺 [LangChain.js入门教学视频](https://www.bilibili.com/video/BV1xb3wzhEDU?p=2&vd_source=101d6a6e5081031e271feb72cb52099e)

### 源代码参考
💻 [GitHub: leonvanzyl/langchain-js](https://github.com/leonvanzyl/langchain-js)

## 环境要求

- Node.js 18+
- 支持 ES Modules (`"type": "module"`)

## 安装依赖

```bash
npm install
```

## 核心依赖

- `@langchain/core` - LangChain 核心库
- `@langchain/openai` - OpenAI 模型支持
- `@langchain/community` - 社区模型支持（Moonshot 等）
- `dotenv` - 环境变量管理

## 使用示例

```javascript
import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";

const model = new ChatMoonshot({
  apiKey: process.env.MOONSHOT_API_KEY,
  model: "moonshot-v1-8k",
  temperature: 0.7,
});

// 基础调用
const response = await model.invoke("What is AI?");

// 流式输出
for await (const chunk of await model.stream("Tell me a story")) {
  process.stdout.write(chunk.content);
}
```

## 学习心得

LangChain 的价值在于：**统一不同 LLM 提供商的接口**，让开发者可以无缝切换模型（OpenAI、Moonshot、Claude 等）而不必重写业务逻辑。掌握其核心概念（Runnable、Chain、Memory）是构建复杂 AI 应用的基础。

---

*持续学习中...* 🚀
📄  笔记记录 ：
1. [LangChain.js 笔记](https://www.yuque.com/u45394422/hkzi9v/hpds4u4qcu15gdqh)