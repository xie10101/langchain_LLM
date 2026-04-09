import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";
import dotenv from "dotenv"; 
dotenv.config();
dotenv.config({ path: ".env.local" });
//  语法改动   


/*
agent是c端的，使用时客户可以动态填充其中的密匙 

 */
// 创建 Kimi 模型
const model = new ChatMoonshot({
  apiKey: process.env.MOONSHOT_API_KEY, // Kimi 密匙
  model: "moonshot-v1-8k", // Kimi 官方模型
  temperature: 0.7,
  streaming: true,
  maxTokens: 1024,
  // 调试模型 -给与返回更多信息 
  verbose: true,
});
// 2. 必须用 async 函数包裹 await
async function run() {
  const response = await model.invoke("What is the meaning of life?"); // 触发调用模型回答 
  console.log("\n=== 回答 ===");   
  console.log(response.content); //  回复内容 
}
// 3. 执行
run();

// 批处理  batch  //仅是并发多个请求 

async function runBatch() { 
      const responses = await model.batch([
      "hellow",
      "How are you?" ,
        ]);
        console.log("\n=== 批处理 ===" ,responses)
  return responses
}


// 流式传入/输出 ？？ 
async function runStream() { 
  const stream = await model.stream("hello?"); // 触发调用模型回答 
  console.log(stream)
  // for await (const chunk of stream) 
  // {
  //    const content = chunk.content || "";
  //    process.stdout.write(content); // 不会换行！非换行打印 -实际stream是一系列对象 
  // }
  // 
} 
async function runStreamLog() { 
  const stream = await model.streamLog("创作一首有关春天的诗歌 ?"); // 触发调用模型回答 
  console.log(stream)
} 



