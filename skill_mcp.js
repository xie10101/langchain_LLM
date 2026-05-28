// ============================================================
// skill_mcp.js — Skill + MCP Agent 实例
//
// 演示 LangChain Agent 同时使用两类工具：
//   1. Skill 工具 — 通过 @langchain/core/tools 的 tool() 直接定义
//   2. MCP  工具 — 通过 @langchain/mcp-adapters 从 MCP Server 动态加载
//
// 依赖（均已在 package.json 中）：
//   @langchain/core  @langchain/openai  @langchain/classic
//   @langchain/mcp-adapters  zod  dotenv
// ============================================================

import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AgentExecutor, createOpenAIFunctionsAgent } from "@langchain/classic/agents";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createInterface } from "readline";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// ============================================================
// 一、定义 Skill 工具（内置能力）
//    每个 Skill 是一个独立的、可复用的专业化工具
//    使用 @langchain/core/tools 的 tool() 函数定义
// ============================================================

// Skill 1：文本分析
// const textAnalysisSkill = tool(
//   async ({ text, aspect }) => {
//     switch (aspect) {
//       case "word_count":
//         return `文本字数：${text.length} 字符 / 约 ${text.split(/\s+/).filter(Boolean).length} 词`;
//       case "language":
//         return /[一-龥]/.test(text)
//           ? "检测到中文字符，该文本大概率是中文或包含中文内容。"
//           : "未检测到中文字符，该文本大概率是非中文语言。";
//       case "summary":
//         return `[分析摘要] 文本共 ${text.length} 字符，首句：「${text.slice(0, 100)}${text.length > 100 ? "..." : ""}」`;
//       default:
//         return `分析维度 "${aspect}" 暂不支持，可用：word_count / language / summary`;
//     }
//   },
//   {
//     name: "text_analysis_skill",
//     description: "文本分析技能：统计字数、检测语言、生成摘要。输入 text（文本内容）和 aspect（分析维度）。",
//     schema: z.object({
//       text: z.string().describe("要分析的文本内容"),
//       aspect: z.enum(["word_count", "language", "summary"]).describe("分析维度"),
//     }),
//   },
// );

// Skill 2：数据格式化
const dataFormatSkill = tool(
  async ({ data, format }) => {
    try {
      const parsed = JSON.parse(data);
      switch (format) {
        case "pretty":
          return JSON.stringify(parsed, null, 2);
        case "keys":
          return `字段列表：${Object.keys(parsed).join(" / ")}`;
        case "count":
          return Array.isArray(parsed)
            ? `数组共 ${parsed.length} 项`
            : `对象包含 ${Object.keys(parsed).length} 个字段`;
        default:
          return JSON.stringify(parsed);
      }
    } catch {
      return `解析失败：输入不是合法的 JSON 字符串。收到 "${data.slice(0, 80)}..."`;
    }
  },
  {
    name: "data_format_skill",
    description: "数据格式化技能：美化 JSON、提取字段名、统计数量。输入 data（JSON 字符串）和 format（输出格式）。",
    schema: z.object({
      data: z.string().describe("JSON 字符串数据"),
      format: z.enum(["pretty", "keys", "count", "raw"]).describe("输出格式"),
    }),
  },
);

// Skill 3：时间日期工具
const datetimeSkill = tool(
  async ({ action, target }) => {
    const now = new Date();
    switch (action) {
      case "now":
        return `当前时间：${now.toISOString()}（时间戳 ${now.getTime()}）`;
      case "weekday":
        return `今天是星期${["日", "一", "二", "三", "四", "五", "六"][now.getDay()]}`;
      case "days_until":
        if (!target) return "请提供目标日期（YYYY-MM-DD 格式）";
        const targetDate = new Date(target);
        if (isNaN(targetDate.getTime())) return `无效日期 "${target}"`;
        const diff = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        return `距离 ${target} 还有 ${diff} 天`;
      default:
        return `未知操作 "${action}"，可用：now / weekday / days_until`;
    }
  },
  {
    name: "datetime_skill",
    description: "日期时间技能：获取当前时间、星期、计算日期间隔。输入 action 和可选的 target 日期。",
    schema: z.object({
      action: z.enum(["now", "weekday", "days_until"]).describe("操作类型"),
      target: z.string().optional().describe("目标日期（YYYY-MM-DD），days_until 时必填"),
    }),
  },
);

// 内置 Skill 工具集合
const skillTools = [ dataFormatSkill, datetimeSkill];
//textAnalysisSkill
// ============================================================
// 二、MCP 工具加载
//    通过 @langchain/mcp-adapters 的 MultiServerMCPClient
//    连接外部 MCP Server，动态加载其暴露的工具
// ============================================================

async function loadMcpTools() {
  const mcpClient = new MultiServerMCPClient({
    // 示例 1：文件系统 MCP Server（通过 npx 启动，不需要额外安装）
    filesystem: {
      command: "npx",
      args: ["-y", "@anthropic/mcp-server-filesystem", "."],
      // 如果 stdio 模式不可用，可改为 HTTP 模式：
      // transport: "http",
      // url: "http://localhost:3000/mcp",
    },

    // 示例 2：自定义 HTTP MCP Server（需要单独启动服务）
    // custom_server: {
    //   transport: "http",
    //   url: "http://localhost:3001/mcp",
    //   headers: { Authorization: "Bearer your-token" },
    // },
  });

  try {
    // initializeConnections 会启动所有 MCP Server 并加载其工具
    const serverToolsMap = await mcpClient.initializeConnections();
    console.log("[MCP] 已连接服务器：", Object.keys(serverToolsMap));

    // 将各 Server 的工具扁平化为一个数组
    const mcpTools = await mcpClient.getTools();
    console.log(
      "[MCP] 加载工具：",
      mcpTools.map((t) => `${t.name} (来源: MCP)`).join(", "),
    );

    return { mcpTools, mcpClient };
  } catch (err) {
    console.warn("[MCP] 连接失败（将以纯 Skill 模式运行）：", err.message);
    // MCP 不可用时返回空工具列表，不影响 Skill 工具的正常使用
    return { mcpTools: [], mcpClient: null };
  }
}

// ============================================================
// 三、创建 Agent — 合并 Skill 工具 + MCP 工具
// ============================================================

async function createAgent() {
  // 1. 初始化 LLM（沿用项目现有的中转 API 配置）
  const model = new ChatOpenAI({
    model: "gpt-5.1",
    apiKey: process.env.JIEKOU_API_KEY,
    configuration: {
      baseURL: "https://api.highwayapi.ai/openai",
    },
  });

  // 2. 加载 MCP 工具（可能为空）
  const { mcpTools, mcpClient } = await loadMcpTools();

  // 3. 合并全部工具：Skill + MCP
  const allTools = [...skillTools, ...mcpTools];
  const toolNames = allTools.map((t) => t.name).join(" / ");
  console.log(`[Agent] 全部工具 (${allTools.length})：${toolNames}`);

  // 4. Prompt 模板
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `你是一个配备了 Skill 和 MCP 工具的智能助手。

关于你的工具：
- 以 _skill 结尾的是内置 Skill 工具，由代码直接提供，用于文本分析、数据格式化、日期时间等任务。
- 其他工具来自外部 MCP Server（如文件系统操作），通过 Model Context Protocol 动态加载。

请根据用户需求选择合适的工具。如果 MCP 工具不可用，使用 Skill 工具完成力所能及的任务。`],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // 5. 创建 Agent
  const agent = await createOpenAIFunctionsAgent({
    llm: model,
    tools: allTools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools: allTools,
    verbose: true,
    returnIntermediateSteps: true,
  });

  return { agentExecutor, mcpClient };
}

// ============================================================
// 四、交互式对话循环
// ============================================================

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Skill + MCP Agent 实例                ║");
  console.log("║   内置 Skill 工具 + 外部 MCP 工具         ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const { agentExecutor, mcpClient } = await createAgent();
  const chatHistory = [];

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question("\n🙋 User: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        console.log("正在关闭...");
        rl.close();
        if (mcpClient) await mcpClient.close();
        return;
      }

      try {
        const response = await agentExecutor.invoke({
          input,
          chat_history: chatHistory,
        });

        // 展示工具调用详情
        if (response.intermediateSteps?.length > 0) {
          console.log("\n--- 工具调用详情 ---");
          response.intermediateSteps.forEach((step, i) => {
            const toolName = step.action?.tool ?? "未知";
            const isSkill = toolName.endsWith("_skill");
            const source = isSkill ? "Skill" : "MCP";
            console.log(`  [${i + 1}] ${toolName} (来源: ${source})`);
          });
          console.log("--- 详情结束 ---");
        }

        console.log(`\n🤖 Agent: ${response.output}`);

        chatHistory.push(new HumanMessage(input));
        chatHistory.push(new AIMessage(response.output));
      } catch (err) {
        console.error("执行出错：", err.message);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main();

/**
 * 
 * 
 * 文件架构
日期时间技能：获取当前时间、星期、计算日期间隔。输入 action 和可选的 target 日期。
skill_mcp.js
├── 一、Skill 工具（内置）            ← @langchain/core/tools 的 tool()
│   ├── text_analysis_skill   文本分析（字数/语言/摘要）
│   ├── data_format_skill     JSON 格式化（美化/字段/计数）
│   └── datetime_skill        日期时间（当前时间/星期/倒计时）
│
├── 二、MCP 工具（外部动态加载）      ← @langchain/mcp-adapters
│   └── MultiServerMCPClient  → 连接文件系统 MCP Server
│       - stdio 模式：npx @anthropic/mcp-server-filesystem
│       - HTTP 模式：可切换（注释中已给出配置示例）
│
├── 三、Agent 创建
│   ├── ChatOpenAI (gpt-5.1 via highwayapi)
│   ├── createOpenAIFunctionsAgent  ← Skill + MCP 工具合并
│   └── AgentExecutor（verbose + intermediateSteps）
│
└── 四、交互式对话循环（readline）
    ├── 工具调用详情标注来源（Skill / MCP）
    └── exit 退出 + 自动清理 MCP 连接
核心区别
Skill 工具	MCP 工具
定义方式	tool() 函数直接写在代码里	MCP Server 通过 stdio/HTTP 暴露，MultiServerMCPClient 动态发现
工具名特征	以 _skill 结尾	由 MCP Server 决定
来源标注	Skill	MCP
离线可用	始终可用	依赖外部进程，失败时优雅降级
使用方式

node skill_mcp.js
MCP Server 不可用时，Agent 自动降级为纯 Skill 模式运行，不会崩溃。
 */


/**
 *  1. 存在最初的报错 —— 
 */