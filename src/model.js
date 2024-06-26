import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function getChatCompletion({ prompt, context }) {
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
        You are a knowledgebase oracle. You are given a question and a context. You answer the question based on the context.
        Analyse the information from the context and draw fundamental insights to accurately answer the question to the best of your ability.
        Notice that the context is not always complete or entirely accurate. You may need to make reasonable assumptions or use your own knowledge to answer the question.
        Finally, explain your reasoning for the answer.

        Context: ${context}
      `,
      },
      { role: "user", content: prompt },
    ],
  });
  return chatCompletion.data.choices[0].message;
}

export { getChatCompletion };