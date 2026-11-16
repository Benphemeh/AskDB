import { defineConfig, env, type AskDbConfig } from "@askdb/config";

export default defineConfig({
  ai: {
    provider: "openai",
    providerConfig: {
      openai: {
        apiKey: env("OPENAI_API_KEY"),
      },
    },
    language: {
      model: env("OPENAI_MODEL"),
    },
    embedding: {
      model: "text-embedding-3-small",
    },
  },
  introspection: {
    provider: "sqlite",
    providerConfig: {
      sqlite: {
        file: "./saas.db",
      },
    },
    outputDir: "./askdb",
  },
  rag: {
    embedder: "ai",
    store: "file",
    storeConfig: {
      file: {},
    },
  },
} satisfies AskDbConfig);
