import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RunnableSequence } from "@langchain/core/runnables";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";

import dotenv from "dotenv";  
dotenv.config();
dotenv.config({ path: ".env.local" });

const model = new ChatMoonshot({
  apiKey: process.env.MOONSHOT_API_KEY,  
  model: "moonshot-v1-8k", 
  temperature: 0.7,
  maxTokens: 1024,
  
});

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.SILICONFLOW_API_KEY, 
  configuration: {
    baseURL: "https://api.siliconflow.com/v1",
  },
  model: "Qwen/Qwen3-Embedding-0.6B",
});


const loader = new CheerioWebBaseLoader("https://js.langchaincn.com/docs/modules/indexes/document_loaders/examples/web_loaders/web_cheerio", {
  selector: ".markdown ",
  timeout: 10000,
});
const docs = await loader.load(); // 返回文档数组 

// 旧项目中会使用 黑盒chain 工具自动对Docs进行处理，但1.0版本提倡透明化 

//   https://js.langchaincn.com/docs/modules/indexes/document_loaders/   
// 做文档切分和 自动化加载 

// 3. ✅ 1.0 标准：文本切割处理
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100, // 每块最大字符数
  chunkOverlap: 10, // 块之间重叠部分
});

// 切割文档（返回切割后的文档数组）
const splittedDocs = await splitter.splitDocuments(docs);


const vectorStore = new MemoryVectorStore(embeddings,splittedDocs);

const vectorStoreResult = await vectorStore.addDocuments(splittedDocs);


//检索 
const restriever = vectorStore.asRetriever(
  {
    k: 3,
  }
);

// 可以自定义docs ：
/*
const docs = [
  new Document({
    pageContent: "这是文档1",
  }),
  new Document({
    pageContent: "这是文档2",
  }),
];
*/

//  对分割后的文档进行重点内容提取整理 

const prompt = ChatPromptTemplate.fromTemplate(
    `
    问题：{question}
     请基于以下内容回答问题：
    上下文：
    {context}
     `
)

const chain = RunnableSequence.from([
  {
    context: async (input) => {
      const docs = await restriever.invoke(input.question);
      console.log(docs);
      return docs.map(d => d.pageContent).join("\n");
    },
    question: (input) => input.question,
  },
  prompt,
  model,
]);

/**
 *  结合Runnale都实现了invoke的特点 
 *  当chain调用 invoke() 时，会自动执行prompt和model ，context的invoke执行- context 为方法此时才执行 
 */
const res = await chain.invoke({ question: "cheerio为啥没法模拟浏览器？" }); 
console.log(res.content)


/** 
 *   文本分割器 Text Splitters 
 *  npm install @langchain/textsplitters  - 拆分到一个专门的包中 
 */
/**
 *  使用本地向量存储 
 * 
 *   采用 siliconflow -服务调用 embedding 模型 -（文本转成“向量”的模型- 理解语义 ）
 *   Qwen/Qwen3-Embedding-0.6B
 */