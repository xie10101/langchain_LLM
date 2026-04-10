import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";
import { ChatPromptTemplate  } from "@langchain/core/prompts";
import dotenv from "dotenv"; 
dotenv.config();
dotenv.config({ path: ".env.local" });

const model = new ChatMoonshot({
  apiKey: process.env.MOONSHOT_API_KEY, 
  model: "moonshot-v1-8k", 
  temperature: 0.7,
  maxTokens: 1024,
});

/**
 *   当前存在这样的LLM 应用场景 ：
 *      笑话生成器 -- 纵向领域生成 
 *      输入任何关键词 - 都返回笑话 
 */


// fromTemplate - 单句
const prompt = ChatPromptTemplate.fromTemplate(`
  You are a joke generator. Given a topic, generate a joke about that topic in chinese.
  Topic: {topic}
  Joke:`); 

// console.log( await prompt.format({ topic: "Dogs" }))  //  提示模版传递可选参数 -- 动态参数 


//Create Chain - 创建链 
const chain = prompt.pipe(model);




//  fromMessages
const chain2 = ChatPromptTemplate.fromMessages([
  ["system", "You are a joke generator. Given a topic, generate a joke about that topic in chinese."],
  ["human", "{topic}"],
  ["ai", "Joke:"],
]).pipe(model);

// const response1 =  await chain2.invoke({ topic: "Dogs" }); // 标准模式 - 在 invoke时自动触发

/*
提示词设置两个方法 ：
  两个方法的介绍 ：   
  fromTempalte -- 基础 
  fromMessages  -- 聊天   -- 更大的控制 - 对 prompt 
*/

// 探索  fromMessages 的标准使用

const chain3 = ChatPromptTemplate.fromMessages([
  ["system",  "你是一个诗词生成器,请根据用户输入的关键词生成一首{lines}行的诗词"],
  ["human", "{topic}"],
  ["ai", "生成的诗词如下"],
]).pipe(model);


const response3 =  await chain3.invoke({lines:5, topic: "Dogs" });

console.log(response3);