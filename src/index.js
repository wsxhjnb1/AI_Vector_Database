import { config } from "dotenv";
import { migrate, nearTextQuery } from "./database.js";
import { getChatCompletion } from "./model.js";

config();

const queryDatabase = async (prompt) => {
  console.info(`Querying database`);

  const questionContext = await nearTextQuery({
    concepts: [prompt],
    fields: "title text date",
    limit: 50,
  });

  // print the content of questionContext
  // console.log(questionContext);

  const context = questionContext
    .map((context, index) => {
      const { title, text, date } = context;
      return `
        Document ${index + 1}
        Date: ${date}
        Title: ${title}

        ${text}
  `;
    })
    .join("\n\n");

  const aiResponse = await getChatCompletion({ prompt, context });
  return aiResponse.content;
};

const main = async () => {
  const command = process.argv[2];
  const params = process.argv[3];

  switch (command) {
    case "migrate":
      return await migrate(params === "--delete-all");
    case "query":
      return console.log(await queryDatabase(params));
    default:
      // do nothing
      break;
  }
};

main();