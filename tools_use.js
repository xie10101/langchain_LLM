import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";
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

dotenv.config();
dotenv.config({ path: ".env.local" });

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
const model = new ChatMoonshot({
  apiKey: process.env.MOONSHOT_API_KEY, 
  model: "moonshot-v1-8k", 
  temperature: 0.7,
  streaming: true,
  maxTokens: 1024,
  // verbose: true,
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
const docs = await loader.load();

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 20,
});
const splitDocs = await splitter.splitDocuments(docs);

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.SILICONFLOW_API_KEY, 
  configuration: {
    baseURL: "https://api.siliconflow.com/v1",
  },
  model: "Qwen/Qwen3-Embedding-0.6B",
});
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
const retriever = vectorStore.asRetriever({ k: 2 });

const retrieverTool = createRetrieverTool(retriever, {
  name: "lcel_search",
  description: "Use this tool for LangChain Expression Language (LCEL)",
});

// 工具部分 ：
const tools = [searchTool,retrieverTool]
//retrieverTool


//openai函数代理 ？ 
const agent = await createOpenAIFunctionsAgent({
  llm: model,
  prompt,
  tools: tools,
});

// 触发 agent 执行 
const agentExecutor = new AgentExecutor({
  agent,
  tools,
  verbose:false
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

    console.log("Agent",response.output)
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
 * 
 *      -存在多个代理类型（？ ）
 *
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