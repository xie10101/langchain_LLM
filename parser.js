// 输出解析器 
import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";
import { ChatPromptTemplate  } from "@langchain/core/prompts";
import  { StringOutputParser,CommaSeparatedListOutputParser,StructuredOutputParser }  from "@langchain/core/output_parsers";
import { z } from "zod";

import dotenv from "dotenv"; 
dotenv.config();
dotenv.config({ path: ".env.local" });

const model = new ChatMoonshot({
  apiKey: process.env.MOONSHOT_API_KEY, // Kimi 密匙
  model: "moonshot-v1-8k", // Kimi 官方模型
  temperature: 0.7,
  maxTokens: 1024,
});

// String -直接解析为字符串 
const parser = new StringOutputParser();
// List 解析为数组 
const parser2 = new CommaSeparatedListOutputParser();
// 解析为特定结构 -- Obj其存在参数设置
const parser3 =  StructuredOutputParser.fromNamesAndDescriptions({ 
  name: "人物是姓名",
  age: " 人物的年龄",
})

// ZOD 使用 
const schema = z.object({
  name: z.string().describe("人物的姓名"),    // 字符串
  age: z.number().describe("人物的年龄"),     // 必须是数字！
  gender: z.enum(["男", "女", "未知"]).describe("性别"), // 枚举
  isStudent: z.boolean().describe("是否为学生"), // 布尔
  habit: z.array(z.string()).describe("爱好"),
  // 
})
const parser4 =  StructuredOutputParser.fromZodSchema(schema)


async function callStringOutputParser(parser) { 
     
// create parser 
const chain1 = ChatPromptTemplate.fromMessages([
  ["system",  "你是一个诗词生成器,请根据用户输入的关键词生成一首{lines}行的诗词"],
  ["human", "{topic}"],
  ["ai", "生成的诗词如下"],
]).pipe(model).pipe(parser);

return   await chain1.invoke({lines:5, topic: "Dogs" });
}


async  function callListOutputParser(parser,parser2) { 
     
const chain3 = ChatPromptTemplate.fromMessages([
  ["system",  "根据输入的关键词生成相同含义的5个词汇按照逗号分隔"],
  ["human", `{phrase}`],
  ["ai", "生成如下"],
]).pipe(model).pipe(parser).pipe(parser2)

// list 解析器 针对的只是使用string解析后的字符串数据 

return   await chain3.invoke({ phrase: "开心" });

  //  callListOutputParser(parser,parser2).then(( result)=> console.log(result))
  //   CommaSeparatedListOutputParser 只能解析纯字符串，不能解析 AIMessage 对象！
}


  // Template 结合 parser2 是标准格式  - 此种使用不合理 
async  function callStructuredParserT( parser) { 
const chain5 = ChatPromptTemplate.fromTemplate(`
   根据输入的句子进行拆分
  Formatting Instructions:{format_instructions}
  sentence :{sentence}
  `).pipe(model).pipe(parser)

return   await chain5.invoke({ format_instructions: parser3.getFormatInstructions(),sentence: "小明13岁了" });
}

async  function callStructuredParser(parser,formatInstructions) { 
     
const chain4 = ChatPromptTemplate.fromMessages([
  ["system",  `根据输入拆分出信息 - \n{formatInstructions}`],
  ["human", `{sentence}`],
  ["ai", "生成如下"],
]).pipe(model).pipe(parser)

// list 解析器 针对的只是使用string解析后的字符串数据 

return   await chain4.invoke({ sentence: "小明13岁了",formatInstructions:formatInstructions });
}



async function extractInfo(parser) {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "你是信息提取专家。\n{format_instructions}"],
    ["human", "输入句子：{sentence}"],
  ]);

  const chain = prompt.pipe(model).pipe(parser);

  return await chain.invoke({
    sentence: "小明今年13岁，男，是一名初中生,爱好打篮球踢足球",
    format_instructions: parser.getFormatInstructions()
  });
}

extractInfo(parser4).then((result)=> console.log(result))


// async function callZodStructuredParser() {
//   const prompt = ChatPromptTemplate.fromTemplate(
//     "Extract information from the following phrase.\n{format_instructions}\n{phrase}"
//   );
//   const outputParser = StructuredOutputParser.fromZodSchema(
//     z.object({
//       recipe: z.string().describe("name of recipe"),
//       ingredients: z.array(z.string()).describe("ingredients"),
//     })
//   );

//   // Create the Chain
//   const chain = prompt.pipe(model).pipe(outputParser);

//   return await chain.invoke({
//     phrase:
//       "The ingredients for a Spaghetti Bolognese recipe are tomatoes, minced beef, garlic, wine and herbs.",
//     format_instructions: outputParser.getFormatInstructions(),
//   });
// }

// const response = await callZodStructuredParser();
// console.log(response);