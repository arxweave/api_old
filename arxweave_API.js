const express = require('express')
const body = require('body-parser') // FIXME: use json/urlencoded
const AWS = require("aws-sdk")
const axios = require('axios')

let app = express()
app.use(body())

const PORT = 8080

AWS.config.update({
  region: "us-west-2"
})

const dynamoDB = new AWS.DynamoDB()

app.get('/', (req, res) => {
  // TODO: max items to get
  // returns all items
  res.send('Hello world  ! ')
})

app.post('/new', async (req, res) => {
  var params = {
    TableName: 'Arxweave',
    Key: {
      'arXivID': {S: req.body.arXivID}
    }
  }

  dynamoDB.getItem(params, (err, data) => {
    if (err)
      console.log("Error", err)
    else {
      if(Object.keys(data).length === 0) {
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
      } else res.send('This arXiv entry is already uploaded.')
    }
  })

  // TODO: call dynamoDB to check if exists
  // if exists return this item is already uplaoded
  // else get data from arXiv API and publish it on dynamoDB

  // res.send('Hello world  !')
})

app.listen(PORT, () =>  {
  console.log(`It's working!`)
})