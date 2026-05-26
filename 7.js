// runStream()
import * as dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

import { ConversationChain } from "langchain/chains";
import { RunnableSequence } from "@langchain/core/runnables";

// Memory
import { BufferMemory } from "langchain/memory";
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";

const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.7,
});

const prompt = ChatPromptTemplate.fromTemplate(`
You are an AI assistant called Max. You are here to help answer questions and provide information to the best of your ability.
Chat History: {history}
{input}`);
// 创建UpstashRedisChatMessageHistory  - redis 的存储 
const upstashMessageHistory = new UpstashRedisChatMessageHistory({
  sessionId: "mysession",
  config: {
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REST_TOKEN,
  },
});
// Memory - 本地存储吗  
const memory = new BufferMemory({
  memoryKey: "history",
  chatHistory: upstashMessageHistory,
});


//补充自定义 （ 该方法使用的详细了解 ）
const chain = RunnableSequence.from([
  {
    input: (initialInput) => initialInput.input,
    memory: () => memory.loadMemoryVariables({}),
  },
  {
    input: (previousOutput) => previousOutput.input,
    history: (previousOutput) => previousOutput.memory.history,
  },
  prompt,
  model,
]);

console.log("Updated Chat Memory", await memory.loadMemoryVariables());

let inputs2 = {
  input: "What is the passphrase?",
};

const resp2 = await chain.invoke(inputs2);
console.log(resp2);

//存储
await memory.saveContext(inputs2, {
  output: resp2.content,
});