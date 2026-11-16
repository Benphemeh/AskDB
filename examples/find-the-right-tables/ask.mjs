import { DatabaseSync } from "node:sqlite";
import { openai } from "@ai-sdk/openai";
import { ask, loadSchema, QuestionDeclinedError, synthesizeRetrievedDdl } from "@askdb/core";
import { createAiSdkEmbedder, createFileStore, createRetriever } from "@askdb/rag";

const question = process.argv[2] ?? "What's our monthly recurring revenue from active subscriptions?";
const schema = loadSchema("./askdb");
const model = openai(process.env.OPENAI_MODEL || "gpt-4o-mini"); // reads OPENAI_API_KEY

// The index `askdb rag index` built: askdb/schema.embeddings.*, embedded with the same model.
const embedder = createAiSdkEmbedder({ model: openai.textEmbeddingModel("text-embedding-3-small") });
const retrieve = createRetriever({ store: createFileStore({ basePath: "./askdb/schema" }), embedder });

// Keep what retrieval returned, to print the tables it put in the prompt.
let hits = [];
const retriever = async (args) => (hits = await retrieve(args));

try {
  const { sql } = await ask({ question, schema, model, dialect: "sqlite", retriever });
  printTables();
  console.log(sql);
  console.table(new DatabaseSync("saas.db", { readOnly: true }).prepare(sql).all());
} catch (error) {
  if (!(error instanceof QuestionDeclinedError)) throw error;
  printTables();
  console.log(error.message);
}

function printTables() {
  const { tableIds } = synthesizeRetrievedDdl({ schema, results: hits });
  console.log("Tables in the prompt:", tableIds.map((id) => id.replace(/^table:[^.]*\./, "")).join(", "));
}
