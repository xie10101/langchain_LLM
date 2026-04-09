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

