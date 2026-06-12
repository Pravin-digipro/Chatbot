require("dotenv").config();
const { DataAPIClient } = require("@datastax/astra-db-ts");

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT);
const collection = db.collection(process.env.ASTRA_DB_COLLECTION);

async function deleteAll() {
  const result = await collection.deleteMany({});
  console.log("Deleted documents:", result);
}

deleteAll();