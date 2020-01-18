const AWS = require("aws-sdk")

// TODO: add to env
const MAX_ENTRIES = 25

AWS.config.update({
  region: "us-west-2"
})

const dynamodb = new AWS.DynamoDB()

// NOTE: DynamoDB is schemaless so you don't need to include
// any non-key attribute definitions in AttributeDefinitions.
// You can add any additional attribute(s) when you put an item
// in your table (have to include Partition/Sort keys).

// NOTE: DynamoDB does not require schema definition,
// and so there is no such thing as a "column".
// You can just add a new item with a new attribute.

const params = {
  TableName : "Arxweave",
  KeySchema: [
    { AttributeName: "arXivID", KeyType: "HASH"}
  ],
  AttributeDefinitions: [
    { AttributeName: "arXivID", AttributeType: "S" } // type STRING
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: MAX_ENTRIES,
    WriteCapacityUnits: MAX_ENTRIES
  }
}

dynamodb.createTable(params, (err, data) => {
  if (err)
    console.error("Unable to create Arxweave table. Error JSON:", JSON.stringify(err, null, 2));
  else
    console.log("Created Arxweave table. Table description JSON:", JSON.stringify(data, null, 2));
})

