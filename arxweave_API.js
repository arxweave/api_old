const express = require('express')
const AWS = require('aws-sdk')
const axios = require('axios')
const parser = require('fast-xml-parser')

const ArweaveService = require('./arweave.js')()

let app = express()

app.use(express.urlencoded({extended: true}))
app.use(express.json())

const PORT = 8080

AWS.config.update({
  region: "us-west-2"
})

const dynamoDB = new AWS.DynamoDB()

app.get('/', (request, response) => {
  // TODO: max items to get
  // returns all items
  res.send('Hello world  ! ')
})

app.post('/new', async (request, response) => {
  const arXivID = request.body.arXivID

  const params = {
    TableName: 'Arxweave',
    Key: {
      'arXivID': {S: arXivID}
    }
  }

  dynamoDB.getItem(params, (err, data) => {
    if (err)
      console.log("Error", err)
    else {
      // If object does not exists, add it in dynamoDB and Arweave.
      if(Object.keys(data).length === 0) {
        axios.get(`https://export.arxiv.org/api/query?id_list=${arXivID}`)
          .then(responseArxiv => parser.convertToJson(parser.getTraversalObj(responseArxiv.data, {}), {}).feed.entry)
          .then(entry => dynamoDB.putItem({
            TableName: 'Arxweave',
            Item: {
              'arXivID' : {S: arXivID},
              'arXivURL' : {S: entry.id},
              'authors' : {S: JSON.stringify(entry.author)},
              'updated' : {S: entry.updated},
              'published' : {S: entry.published},
              'title' : {S: entry.title},
              'summary' : {S: entry.summary},
              'pdf_link' : {S: entry.id.replace("abs", "pdf")}
            }
          }, (err, data) => {
            if (err)
              console.log("Error", err)
            else
              console.log("Success", data)
          }))
          .then(() => ArweaveService.createDataTx({
            data: `<html>${arXivID}</html>`, // TODO: put blob arXiv PDF.
            tags: [{ 'Content-Type': 'text/html' }] // TODO: put arXiv metadata.
          }))
          .then(rawTx => ArweaveService.broadcastTx({ tx: rawTx }))
          .then(broadcastedTx => response.send({msg: `Data is uploading to arweave with this broadcast ID ${broadcastedTx.id}.`}))
          .catch(console.log)
      } else response.send({msg: `This arXiv entry is already uploaded.`})
    }
  })
})

app.listen(PORT, () =>  {
  console.log(`It's working!`)
})