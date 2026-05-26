import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor,createOpenAIFunctionsAgent} from "@langchain/classic/agents";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { TavilySearch } from "@langchain/tavily";
import { Readline } from "readline/promises";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
// import { RunnableSequence } from "@langchain/core/runnables";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createRetrieverTool } from "@langchain/classic/tools/retriever";
import { AIMessage,HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv"; 
import { createInterface } from "readline";
import { createReactAgent } from "@langchain/classic/agents";

dotenv.config();
dotenv.config({ path: ".env.local" });


// const model = new ChatMoonshot({
//   apiKey: process.env.MOONSHOT_API_KEY, 
//   model: "moonshot-v1-8k", 
//   temperature: 0.7,
//   streaming: false,
//   maxTokens: 1024,
//   verbose: true,
// });
const model = new ChatOpenAI({
  model: "gpt-5.1",
  apiKey: process.env.JIEKOU_API_KEY, // 通常是中转站平台的 key
  configuration: {
    baseURL: "https://api.highwayapi.ai/openai", // 关键：替换成中转地址
  },
  // streamUsage: false,
});

// 提示词部分 
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful assistant that answers questions about the world.",
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad")
]);
//  占位符的使用 -包括invoke参数输入和 agent工具调用历史记录自动补充 


//  Tavily Search 工具 - 联网搜搜 
const searchTool = new TavilySearch({
  maxResults: 2,
  includeAnswer: true,
});

// 补充检索工具--现在仅是特定网页内容的增强向量检索- 是否可以升级 
// 加载数据
const loader = new CheerioWebBaseLoader(
  "https://js.langchain.com/docs/expression_language/"
);
const docs = await loader.load(); // 转为文档对象 

//  文档数据切分 
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 20,
});
// 切分后的文档对象 
const splitDocs = await splitter.splitDocuments(docs);

// 创建向量存储实例（数据转为向量）
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.SILICONFLOW_API_KEY, 
  configuration: {
    baseURL: "https://api.siliconflow.com/v1",
  },
  model: "Qwen/Qwen3-Embedding-0.6B",
});
// 将切分后的文档对象转为向量存储对象  -- 本地存储 
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);

// 检索器
const retriever = vectorStore.asRetriever({ k: 2 });

// 创建检索工具实例 
const retrieverTool = createRetrieverTool(retriever, {
  name: "lcel_search",
  description: "Use this tool for LangChain Expression Language (LCEL)",
});

// 工具 ：
const tools = [searchTool,retrieverTool]

//openai函数代理  —— 多模型兼容 
const agent = await createOpenAIFunctionsAgent({
  llm: model,
  prompt, 
  tools: tools,
});

// 触发 agent 执行
const agentExecutor = new AgentExecutor({
  agent,
  tools,
  verbose: true,                        // 开启详细日志，看到 agent 内部推理过程
  returnIntermediateSteps: true,        // 返回工具调用的中间步骤，暴露工具输出
});

const chat_history =[]

const rl =createInterface(
  {
    input:process.stdin,
    output:process.stdout
  }
)

// 循环函数中重复回答 并设置退出键 ， 
const askQuestion =()=>{
  rl.question("User:",async (input)=>{
    //Call Agent 
   //  对输入exit 退出 
    if(input.toLowerCase()==="exit")
      {
        rl.close()
        return;
      }     

    const response = await agentExecutor.invoke({
      input: input,
      chat_history
    });

    // 打印工具调用的中间步骤（排查工具是否被调用、返回了什么）
    if (response.intermediateSteps?.length > 0) {
      console.log("\n=== 工具调用详情 ===");
      // response.intermediateSteps.forEach((step, i) => {
      //   console.log(`[工具 ${i + 1}] ${step.action.tool}`);
      //   console.log(`  输入: ${step.action.toolInput.query ?? JSON.stringify(step.action.toolInput)}`);
      //   console.log(`  输出: ${JSON.stringify(step.observation).slice(0, 500)}`);
      // });
      console.log("===================\n");
    }

    console.log("Agent:", response.output);
    // 补充历史  
    chat_history.push(new HumanMessage(input));
    chat_history.push(new AIMessage(response.output));
     askQuestion();
  })
}
askQuestion()

/**
 * 
 * 额外变量 - 代理跟踪 -- MessagesPlaceholder
 * 
 * langchain/agents 
 *   
 * // openai 函数代理
 * 
 * createOpenAIFnAgents 
 *    -存在多个代理类型（？ ）
 * //创建 工具 
 * 
 * const tools =[]
 * 
 * // AgentExcecutor代理激活 ？  
 *    
 *  new   AgentExcecutor
 * 
 * 
 * 1. 搜索工具 
 *   - 搜索工具 Tavily AI 
 *     searchTool 
 *   --- 天气搜索 
 * 
 * 2. 上期检索器作为工具 
 *
 * // 升级为机器人 -从终端获取输入信息 
 * // 动态 input 
 * // npm install readline 
 *  获取用户输入 
 *  const readline = require('readline');
 * const rl = readline.createInterface({
 *   input: process.stdin,
 *   output: process.stdout
 * })
 * 
 * rl.question('请输入你的问题：', (answer) => {
    替换为 agentExecutor invoke  
 *   
    console.log ("Agent" , xx )
 *  })
 * 
 *  // 设置函数 -- 循环调用实现多次对话的效果  
 */
    /**
     * 
     *  模型使用 ：
     *   1. gpt-4o-mini 
     *   2. https://api.jiekou.ai/openai baseURl
     *   sk_Iy-vtTtA2ojNbpCZQLmtzIU8JyKOTKpWpzzVz7h-Ysk
     */

// 简单实现多轮对话 + 单轮历史记录 （网络搜索未体现）

// 主要的知识点  ：  
// langchain中agent 概念 
// tools  
// agentExecutor
// 
// readine 使用