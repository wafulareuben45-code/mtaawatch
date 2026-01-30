// Simple AWS Lambda (API Gateway) to accept reports and save to DynamoDB
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'MTWReports';

const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event;
    if (!body || !body.email || !body.title) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const item = {
      id: uuidv4(),
      email: body.email,
      title: body.title,
      description: body.description || '',
      location: body.location || '',
      department: body.department || 'unassigned',
      action: 'report',
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    const putParams = {
      TableName: TABLE_NAME,
      Item: item
    };

    await ddb.send(new PutCommand(putParams));

    return { statusCode: 201, body: JSON.stringify({ success: true, id: item.id }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
