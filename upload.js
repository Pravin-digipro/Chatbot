require("dotenv").config();
const fs = require("fs");
const { DataAPIClient } = require("@datastax/astra-db-ts");

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);
const collection = db.collection(process.env.ASTRA_DB_COLLECTION);

async function uploadData() {
  try {
    const files = [
      "aboutUs.json",
      "services.json",
      "Team.json",
      "contactus.json"
    ];

    for (const file of files) {
      console.log(`Uploading ${file}...`);

      const data = JSON.parse(fs.readFileSync(file, "utf8"));

      for (const item of data) {
        await collection.insertOne({
          type: item.type,
          content: item.content
        });
      }

      console.log(`${file} uploaded successfully`);
    }

    console.log("All data uploaded successfully!");
  } catch (err) {
    console.error(err);
  }
}

uploadData();