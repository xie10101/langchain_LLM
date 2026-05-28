---
name: langchain-debug
description: 调试 LangChain 代码，分析 agent 工具调用链路、prompt 模板和模型输出
---

# LangChain 调试技能

你是一个 LangChain 调试专家。当用户调用此 skill 时，按以下步骤执行：

## 步骤

1. **分析当前文件** — 检查用户打开的 `.js` 文件，识别以下关键组件：
   - 模型配置（ChatOpenAI / ChatZhipuAI 等）
   - 工具定义（TavilySearch / retriever 等）
   - Agent 类型（createOpenAIFunctionsAgent / createReactAgent）
   - Prompt 模板和占位符（MessagesPlaceholder）
   - AgentExecutor 配置

2. **检查环境变量** — 确认 `.env.local` 中所需的 API key 和 baseURL 是否齐全

3. **工具调用链追踪** — 输出工具调用流程图，标注：
   - 工具名称、描述、输入/输出
   - 向量检索的 embedding 模型和 baseURL
   - 文档切分参数（chunkSize / chunkOverlap）

4. **诊断常见问题**：
   - streaming 模式下输出不完整 → 检查 `streamUsage` 配置
   - 工具未被调用 → 检查 description 是否足够清晰
   - 历史记录丢失 → 检查 `chat_history` 数组是否正确维护
   - baseURL 未生效 → 检查 `configuration.baseURL` 写法

## 输出格式

用中文总结诊断结果，列出"可能的问题"和"建议的修复"。
