import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import dotenv from "dotenv";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { UpstashRedisStore } from "@langchain/community/storage/upstash_redis";
import { Redis } from "@upstash/redis";

dotenv.config();
dotenv.config({ path: ".env.local" });

const model = new ChatOpenAI({
  model: "gpt-5.1",
  apiKey: process.env.JIEKOU_API_KEY,
  configuration: {
    baseURL: "https://api.highwayapi.ai/openai",
  },
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are an AI assistant called Max."],
  new MessagesPlaceholder("history"),
  ["human", "{input}"],
]);

const chain = prompt.pipe(model);

// ============================================================
// UpstashRedisStore 手动封装 → BaseListChatMessageHistory
// ============================================================

class UpstashStoreChatMessageHistory extends BaseListChatMessageHistory {
  constructor({ sessionId, store }) {
    super();
    this._sessionId = sessionId;
    this._store = store;
    this._key = `chat:${sessionId}`;
  }

  async getMessages() {
    // mget 接受 string[]，返回 Uint8Array[]
    const [raw] = await this._store.mget([this._key]);
    if (!raw || raw.length === 0) return [];

    // 解码二进制 → JSON → 还原为消息对象
    const stored = JSON.parse(new TextDecoder().decode(raw));
    return mapStoredMessagesToChatMessages(stored);
  }

  async addMessage(message) {
    const messages = await this.getMessages();
    messages.push(message);
    await this._save(messages);
  }

  async addMessages(messages) {
    const existing = await this.getMessages();
    await this._save([...existing, ...messages]);
  }

  async clear() {
    await this._store.mdelete([this._key]);
  }

  async _save(messages) {
    // msg.toDict() → StoredMessage 格式（LangChain 标准序列化）
    const stored = messages.map((m) => m.toDict());
    // 编码为 Uint8Array（UpstashRedisStore 要求）
    const encoded = new TextEncoder().encode(JSON.stringify(stored));
    // mset 接受 [key, Uint8Array][]
    await this._store.mset([[this._key, encoded]]);
  }
}

// ============================================================
// 初始化
// ============================================================

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const store = new UpstashRedisStore({ client: redisClient });

const getMessageHistory = async (sessionId) =>
  new UpstashStoreChatMessageHistory({ sessionId, store });

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory,
  inputMessagesKey: "input",
  historyMessagesKey: "history",
});

// ============================================================
// 测试
// ============================================================

const resp1 = await chainWithHistory.invoke(
  { input: "密码是 6582352" },
  { configurable: { sessionId: "chat1" } }
);
console.log("resp1:", resp1.content);

const resp2 = await chainWithHistory.invoke(
  { input: "密码是多少？" },
  { configurable: { sessionId: "chat1" } }
);
console.log("resp2:", resp2.content);
