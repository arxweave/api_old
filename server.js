const express = require('express')
const AWS = require('aws-sdk')
const axios = require('axios')
const parser = require('fast-xml-parser')
const pdf2base64 = require('pdf-to-base64')

const ArweaveService = require('./arweave.js')()

let app = express()

app.use(express.urlencoded({extended: true}))
app.use(express.json())

const PORT = 8080

AWS.config.update({
  region: "us-west-2"
})

const dynamoDB = new AWS.DynamoDB()

// Get all arXiv documents
// TODO: add pagination.
app.get('/all', (request, response) => {
  const params = {
    TableName: 'Arxweave',
    ProjectionExpression: 'arXivID, arXivURL, authors, broadcastedTxID, pdfLink, published, summary, title, statusArweave'
  }

  const docClient = new AWS.DynamoDB.DocumentClient()

  // FIXME: show errors to console.log() .
  docClient.scan(params, (err, data) => response.send(data !== null ? data.Items : `{msg: 'There is not any item.'}`)) // NOTE: 1MB limit.
  // docClient.scan(params, (err, data) => console.log(err)) // NOTE: 1MB limit.
})

// Get single arXiv document
app.get('/arXivID/:arXivID', (request, response) => {
  const arXivID = request.params.arXivID

  const params = {
    TableName: 'Arxweave',
    Key: {
      'arXivID': {S: arXivID}
    }
  }

  dynamoDB.getItem(params, async (err, data) => {
    if (err)
      console.log('Error', err)
    else {
      // If object does not exists, add it in dynamoDB and Arweave.
      if(Object.keys(data).length === 0) {
        response.send({
          status: 'Bad Request',
          msg: `This arXiv entry does not exist in Arxweave.`}
        )
      } else response.send(data)
    }
  })
})

app.post('/new', async (request, response) => {
  const arXivID = request.body.arXivID

  const params = {
    TableName: 'Arxweave',
    Key: {
      'arXivID': {S: arXivID}
    }
  }

  dynamoDB.getItem(params, async (err, data) => {
    if (err)
      console.log('Error', err)
    else {
      // If object does not exists, add it in dynamoDB and Arweave.
      if(Object.keys(data).length === 0) {
        try {
          const responseArxiv = await axios.get(`https://export.arxiv.org/api/query?id_list=${arXivID}`)
          const entry = parser.convertToJson(parser.getTraversalObj(responseArxiv.data, {}), {}).feed.entry

          const arXivPdfBase64 = await pdf2base64(entry.id.replace('abs', 'pdf'))

          const arweaveTxPrice = await axios.get(`https://arweave.net/price/${Buffer.byteLength(arXivPdfBase64, 'utf8')}`)

          const rawTx = await ArweaveService.createDataTx({
            data: arXivPdfBase64,
            reward: `${arweaveTxPrice.data}`,
            tags: [{
              'Encode': 'base64',
              'Content-Type': 'application/pdf',
              'arXivID': arXivID,
              'authors': JSON.stringify(entry.author),
              'updated': entry.updated,
              'published': entry.published,
              'title': entry.title,
              'summary': entry.summary,
              'pdfLink': entry.id.replace("abs", "pdf")
            }]
          })

          const broadcastedTx = await ArweaveService.broadcastTx({ tx: rawTx })

          if (broadcastedTx.id)
            await dynamoDB.putItem({
              TableName: 'Arxweave',
              Item: {
                'arXivID': {S: arXivID},
                'authors': {S: JSON.stringify(entry.author)},
                'updated': {S: entry.updated},
                'published': {S: entry.published},
                'title': {S: entry.title},
                'summary': {S: entry.summary},
                'pdfLink': {S: entry.id.replace("abs", "pdf")},
                'broadcastedTxID': {S: broadcastedTx.id},
                'statusArweave': {S: `${broadcastedTx.status}`} // NOTE: status attribute is a dynamo name reserved.
              }
            }, (err, data) => {
              if (err)
                console.log('Error', err)
              else
                console.log('Success', data)
            })

          response.send({
            status: broadcastedTx.status === 200 ? 'Success' : 'Error',
            msg: `Data is uploading to arweave with this broadcast ID ${broadcastedTx.id} and Arweave status ${broadcastedTx.status}.`
          })
        } catch (error) {
          console.error(error)
        }
      } else response.send({
        status: 'Bad Request',
        msg: `This arXiv entry is already uploaded.`}
      )
    }
  })
})

app.listen(PORT, () =>  {
  console.log(`It's working!`)
})