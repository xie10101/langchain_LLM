import { ChatPromptTemplate } from "@langchain/core/prompts";
// ✅ 新版（2025 年最新）
import { BufferMemory } from "@langchain/community/stores/memory";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import dotenv from "dotenv"; 
dotenv.config();
dotenv.config({ path: ".env.local" });

// llm 设置 
const model = new ChatOpenAI({
  model: "gpt-5.1",
  apiKey: process.env.JIEKOU_API_KEY, // 通常是中转站平台的 key
  configuration: {
    baseURL: "https://api.highwayapi.ai/openai", // 关键：替换成中转地址
  },
  // streamUsage: false,
});


//提示词设置 
const prompt = ChatPromptTemplate.fromTemplate(`
    You are an AI assistant called Max.
{input}
    `)

    //
const  chain = prompt.pipe(model);

// 获取 响应 
//LCEL 

let inputs1 = {
  input: "the passphrase  is  6582352 ?",
};

//大模型执行为异步行为 
const resp1 = await chain.invoke(inputs1);
console.log(resp1);

//  扩展缓存内容 - 并将数据保存至数据库中 
const memory = new BufferMemory({
// 创建内存键：·
memoryKey: "history",
     
 }
);

let inputs2 = {
  input: "What is the passphrase?",
};

//大模型执行为异步行为 
const resp2 = await chain.invoke(inputs2);
console.log(resp2);
// 查看内存内容 
console.log("Updated Chat Memory", await memory.loadMemoryVariables());

/**
 * //BufferMemory = LangChain 里最简单、最常用的「聊天记忆管理器」
    把多轮对话历史存起来
    自动拼进提示词给模型看
    让 AI 记住 “刚才聊了什么”     - 代替之前的history 数组 
 */

//1.内存对象没有管道方法 ：
// 传统方法 ：使用 ConversationChain 
// const chainWithMemory = new ConversationChain({


// LCEL 使用 



// 将短期记忆存储至 redis服务器- upstash 提供
const upstashChatHistory =  new UpstashRedisChatMessageHistory(
    {
        sessionId:"chat1 "
    }
)



chain.addMemory(memory);


// 接入 uppatch-redis 服务： 
