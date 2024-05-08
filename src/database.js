import weaviate, { ApiKey } from "weaviate-ts-client";
import { config } from "dotenv";

import { FAKE_XORDIA_HISTORY } from "./data.js";
import { CLASS_INFO } from "./classinfo.js";

config();

async function setupCient() {
  let client;
  try {
    client = weaviate.client({
      scheme: "https",
      host: process.env.WEAVIATE_URL,
      apiKey: new ApiKey(process.env.WEAVIATE_API_KEY),
      headers: { "X-OpenAI-Api-Key": process.env.OPENAI_API_KEY },
    });
  } catch (err) {
    console.error("error >>>", err.message);
  }

  return client;
}

async function migrate(shouldDeleteAllDocuments = false) {
  try {
    const classObj = {
      class: process.env.DATA_CLASSNAME,
      vectorizer: "text2vec-openai",
      moduleConfig: {
        "text2vec-openai": {
          model: "text-embedding-3-small",
          type: "text",
        },
      },
    };

    const client = await setupCient();
    try {
      const schema = await client.schema
        .classCreator()
        .withClass(classObj)
        .do();
      console.info("created schema >>>", schema);
    } catch (err) {
      console.error("schema already exists");
    }

    if (!FAKE_XORDIA_HISTORY.length) {
      console.error(`Data is empty`);
      process.exit(1);
    }

    if (shouldDeleteAllDocuments) {
      console.info(`Deleting all documents`);
      await deleteAllDocuments();
    }

    console.info(`Inserting documents`);
    await addDocuments(FAKE_XORDIA_HISTORY);
    await addDocuments(CLASS_INFO);
  } catch (err) {
    console.error("error >>>", err.message);
  }
}

const addDocuments = async (data = []) => {
  const client = await setupCient();
  let batcher = client.batch.objectsBatcher();
  let counter = 0;
  const batchSize = 100;

  for (const document of data) {
    const obj = {
      class: process.env.DATA_CLASSNAME,
      properties: { ...document },
    };

    batcher = batcher.withObject(obj);

    if (counter++ == batchSize) {
      await batcher.do();

      counter = 0;
      batcher = client.batch.objectsBatcher();
    }
  }

  const res = await batcher.do();
  return res;
};

async function deleteAllDocuments() {
  const client = await setupCient();
  const documents = await client.graphql
    .get()
    .withClassName(process.env.DATA_CLASSNAME)
    .withFields("_additional { id }")
    .do();

  for (const document of documents.data.Get[process.env.DATA_CLASSNAME]) {
    await client.data
      .deleter()
      .withClassName(process.env.DATA_CLASSNAME)
      .withId(document._additional.id)
      .do();
  }
}

async function nearTextQuery({
  concepts = [""],
  fields = "text category",
  limit = 1,
}) {
  const client = await setupCient();
  const res = await client.graphql
    .get()
    .withClassName(process.env.DATA_CLASSNAME)
    .withFields(fields)
    .withNearText({ concepts })
    .withLimit(limit)
    .do();

  return res.data.Get[process.env.DATA_CLASSNAME];
}

export { setupCient, migrate, addDocuments, deleteAllDocuments, nearTextQuery };