/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** DeepSeek / 豆包 等 OpenAI 兼容接口的密钥（可选，留空则用本地解读） */
  readonly VITE_LLM_API_KEY?: string;
  /** 自定义接口地址（可选，默认 DeepSeek） */
  readonly VITE_LLM_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
