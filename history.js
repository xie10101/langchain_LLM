import { ChatZhipuAI} from "@langchain/community/chat_models/zhipuai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import  {BufferMemory} from "@langchain/core/memory";
import dotenv from "dotenv"; 
dotenv.config();
dotenv.config({ path: ".env.local" });


const model = new ChatZhipuAI({
  apiKey: process.env.ZHIPU_API_KEY, 
  model: "GLM-4.7-Flash", 
  temperature: 0.7,
  streaming: true,
  maxTokens: 5024,
});

//单次内存记忆 ——> 长期记忆 

const prompt = ChatPromptTemplate.fromTemplate(`
    You are an AI assistant called Max.
{input}
    `)

const  chain = prompt.pipe(model);

// 获取 响应 
//LCEL 

let inputs2 = {
  input: "What is the passphrase?",
};

const resp2 = await chain.invoke(inputs2);
console.log(resp2);

//  扩展缓存内容 - 并将数据保存至数据库中 
const memory = new BufferMemory();
chain.addMemory(memory);


// 接入 uppatch-redis 服务 ；