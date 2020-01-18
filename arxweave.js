const AWS = require("aws-sdk")
const axios = require('axios')
const parser = require('fast-xml-parser')

// TODO: add to env
const MAX_ENTRIES = 25

const myArgs = process.argv.slice(2)

START_ENTRY = Number(myArgs[0]) || 0
NUMBER_OF_ENTRIES = Number(myArgs[1])
  ? Number(myArgs[1]) <= MAX_ENTRIES && Number(myArgs[1]) > 1 // Limit max 1000 entries to upload to AWS
    ? Number(myArgs[1])
    : 10
  : 10

AWS.config.update({
  region: "us-west-2"
})

const dynamoDB = new AWS.DynamoDB()

axios.get(`https://export.arxiv.org/api/query?search_query=all&start=${START_ENTRY}&max_results=${NUMBER_OF_ENTRIES}`)
  .then(responseArxiv => parser.convertToJson(parser.getTraversalObj(responseArxiv.data, {}), {}).feed.entry)
  .then(entriesJsonArrArxiv => entriesJsonArrArxiv.map(
    entry => ({
      PutRequest: {
        Item: {
          'arXivID' : {S: entry.id},
          'authors' : {S: JSON.stringify(entry.author)},
          'updated' : {S: entry.updated},
          'published' : {S: entry.published},
          'title' : {S: entry.title},
          'summary' : {S: entry.summary},
          'pdf_link' : {S: entry.id.replace("abs", "pdf")}
        }
      }
    })
  ))
  .then(entriesJsonArrForDBArxiv => dynamoDB.batchWriteItem({ RequestItems: { "Arxweave": entriesJsonArrForDBArxiv }}, (err, data) => {
    if (err)
      console.log("Error", err)
    else
      console.log("Success", data)
  }))
  .catch(console.log)