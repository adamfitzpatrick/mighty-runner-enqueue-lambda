const rewire = require('rewire')
const sinon = require('sinon')
const chai = require('chai')
chai.should()
chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

describe('enqueue-lambda', () => {
  let sut
  let snsMock
  let consoleStubs
  let event
  let response

  const promiseResolver = (value) => {
    return { promise: () => Promise.resolve(value) }
  }

  const setEnvVars = () => {
    sut.__set__('process', {
      env: {
        TOPIC_ARN: 'topic_arn',
        REGION: 'us-west-2',
        OBJECT_ID_FIELD: 'objectIdField'
      }
    })
  }

  beforeEach(() => {
    sut = rewire('./enqueue-lambda')
    const fakeSns = {
      publish: () => 'publish'
    }
    snsMock = sinon.mock(fakeSns)
    const FakeSnsConstructor = function () {
      Object.assign(this, fakeSns)
    }
    sut.__get__('AWS').SNS = FakeSnsConstructor
    consoleStubs = {
      log: sinon.stub().callsFake(msg => console.log(msg)),
      error: sinon.stub()
    }
    sut.__set__('console', consoleStubs)
    event = {
      pathParameters: {
        objectIdField: 'objectId'
      },
      headers: {
        Authorization: 'Bearer KEY',
        Origin: 'origin'
      },
      body: JSON.stringify({ data: 'stuff' })
    }
    response = {
      statusCode: 202,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'origin'
      },
      body: JSON.stringify({ message: 'accepted' })
    }
  })

  describe('when provided with the required pathParameter', () => {
    let params

    beforeEach(() => {
      setEnvVars()
      params = {
        TopicArn: 'topic_arn',
        Message: JSON.stringify({ userId: 'KEY', objectId: 'objectId', payload: { data: 'stuff' } })
      }
      return snsMock.expects('publish')
        .withExactArgs(params)
        .returns(promiseResolver({}))
    })

    describe('and an Authorization header', () => {
      it('should publish to SNS using the Authorization header for the userId', () => {
        return sut(event).should.eventually.deep.equal(response).then(() => {
          snsMock.verify()
        })
      })
    })

    describe('and an authorization header', () => {
      it('should publish to SNS using the authorization header for the userId', () => {
        event.headers.authorization = event.headers.Authorization
        delete event.headers.Authorization
        return sut(event).should.eventually.deep.equal(response).then(() => {
          snsMock.verify()
        })
      })
    })

    describe('and an Origin header', () => {
      it('should publish to SNS and use Origin in the response CORS headers', () => {
        return sut(event).should.eventually.deep.equal(response).then(() => {
          snsMock.verify()
        })
      })
    })

    describe('and an origin header', () => {
      it('should publish to SNS and use origin in the response CORS headers', () => {
        event.headers.origin = event.headers.Origin
        delete event.headers.Origin
        return sut(event).should.eventually.deep.equal(response).then(() => {
          snsMock.verify()
        })
      })
    })

    describe('and no indication of origin', () => {
      it('should publish to SNS and return * in the CORS headers', () => {
        delete event.headers.Origin
        response.headers['Access-Control-Allow-Origin'] = '*'
        return sut(event).should.eventually.deep.equal(response).then(() => {
          snsMock.verify()
        })
      })
    })
  })

  describe('when not provided with a pathParameter', () => {
    it('should respond with an error message', () => {
      setEnvVars()
      delete event.pathParameters.objectIdField
      response.statusCode = 400
      response.body = JSON.stringify({ message: 'missing required path parameter' })
      return sut(event).should.eventually.deep.equal(response).then(() => {
        consoleStubs.error.should.have.been.calledWith('missing required path parameter')
      })
    })
  })

  describe('when not provided with a valid JSON payload', () => {
    it('should respond with an error message', () => {
      setEnvVars()
      event.body = 'bad json'
      response.statusCode = 400
      response.body = JSON.stringify({ message: 'payload is not valid JSON' })
      return sut(event).should.eventually.deep.equal(response).then(() => {
        consoleStubs.error.should.have.been.calledWith('payload is not valid JSON')
      })
    })
  })

  describe('when the lambda is not properly configured', () => {
    it('should log the error and provide a 500 response', () => {
      response.statusCode = 500
      response.body = JSON.stringify({ message: 'internal server error' })
      sut.__set__('process', { env: {} })
      return sut(event).should.eventually.deep.equal(response).then(() => {
        consoleStubs.error.should.have.been.calledWith('lambda is not properly configured')
      })
    })
  })

  describe('when SNS returns an error', () => {
    it('should log the error and re-throw it', () => {
      setEnvVars()
      const params = {
        TopicArn: 'topic_arn',
        Message: JSON.stringify({ userId: 'KEY', objectId: 'objectId', payload: { data: 'stuff' } })
      }
      snsMock.expects('publish')
        .withExactArgs(params)
        .returns({ promise: () => Promise.reject(new Error('error')) })
      response.statusCode = 500
      response.body = JSON.stringify({ message: 'internal server error' })
      return sut(event).should.eventually.deep.equal(response).then(() => {
        consoleStubs.error.should.have.been.calledWith('error')
      })
    })
  })
})
