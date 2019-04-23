const AWS = require('aws-sdk')

const initialize = () => {
  AWS.config.update({ region: process.env.REGION })
  return {
    sns: new AWS.SNS({ apiVersion: '2012-03-31' }),
    TopicArn: process.env.TOPIC_ARN,
    objectIdField: process.env.OBJECT_ID_FIELD,
    region: process.env.REGION
  }
}

const isConfigInvalid = ({ sns, TopicArn, region }) => {
  if (!sns || !TopicArn || !region) {
    return true
  }
}

const getAuthToken = (headers) => {
  const authHeader = headers.Authorization || headers.authorization
  return authHeader.trim().replace('Bearer ', '')
}

const getOrigin = (headers) => {
  return headers.Origin || headers.origin || '*'
}

const getPayload = (event) => {
  try {
    return JSON.parse(event.body)
  } catch (e) {}
}

const publish = (config, Message) => {
  const params = {
    TopicArn: config.TopicArn,
    Message
  }
  return config.sns.publish(params).promise()
}

const buildResponse = (config, statusCode, errMessage) => {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': config.origin
    },
    body: JSON.stringify({ message: 'accepted' })
  }
  if (errMessage) {
    response.body = JSON.stringify({ message: errMessage })
  }
  return response
}

const enqueueLambda = async (event) => {
  const config = initialize()
  config.userId = getAuthToken(event.headers)
  config.origin = getOrigin(event.headers)

  if (isConfigInvalid(config)) {
    console.error('lambda is not properly configured')
    return buildResponse(config, 500, 'internal server error')
  }

  const objectId = event.pathParameters[config.objectIdField]
  if (!objectId) {
    console.error('missing required path parameter')
    return buildResponse(config, 400, 'missing required path parameter')
  }

  const payload = getPayload(event)
  if (!payload) {
    console.error('payload is not valid JSON')
    return buildResponse(config, 400, 'payload is not valid JSON')
  }
  const Message = JSON.stringify({ userId: config.userId, objectId, payload })

  return publish(config, Message)
    .then(data => buildResponse(config, 202, null, data.Items))
    .catch(err => {
      console.error(err.message)
      return buildResponse(config, 500, 'internal server error')
    })
}

module.exports = enqueueLambda
