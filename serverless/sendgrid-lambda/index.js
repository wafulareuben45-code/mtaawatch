const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const sgMail = require('@sendgrid/mail');

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'MTWReports';

const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL;
    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');
    if (!FROM_EMAIL) throw new Error('FROM_EMAIL not configured');

    sgMail.setApiKey(SENDGRID_API_KEY);

    // find reports older than 7 days that are not resolved/closed and have not been notified
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: 'action = :report AND (attribute_not_exists(notifySent) OR notifySent = :false) AND #st IN (:p, :ip) AND timestamp <= :week',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':report': 'report',
        ':false': false,
        ':p': 'pending',
        ':ip': 'in-progress',
        ':week': weekAgo
      }
    };

    const result = await ddb.send(new ScanCommand(scanParams));
    const items = result.Items || [];

    console.log(`Found ${items.length} reports to notify.`);

    for (const item of items) {
      try {
        const msg = {
          to: item.email,
          from: FROM_EMAIL,
          subject: `Update on your report: ${item.title}`,
          text: `Hello,\n\nThis is an update regarding the report you submitted on ${new Date(item.timestamp).toLocaleString()}. Current status: ${item.status}.\n\nTitle: ${item.title}\nDescription: ${item.description}\nDepartment: ${item.department || 'Unassigned'}\n\nIf the issue is resolved, no action is needed. If you need more details, please contact support.\n\nRegards,\nMtaaWatch Team`,
          html: `<p>Hello,</p><p>This is an update regarding the report you submitted on <strong>${new Date(item.timestamp).toLocaleString()}</strong>.</p><p><strong>Current status:</strong> ${item.status}</p><p><strong>Title:</strong> ${item.title}<br><strong>Department:</strong> ${item.department || 'Unassigned'}</p><p>${item.description}</p><p>If the issue is resolved, no action is needed. If you need more details, please contact support.</p><p>Regards,<br/>MtaaWatch Team</p>`
        };

        await sgMail.send(msg);

        // mark notifySent and record notifySentAt
        const updateParams = {
          TableName: TABLE_NAME,
          Key: { id: item.id },
          UpdateExpression: 'SET notifySent = :true, notifySentAt = :now',
          ExpressionAttributeValues: {
            ':true': true,
            ':now': new Date().toISOString()
          }
        };

        await ddb.send(new UpdateCommand(updateParams));
        console.log(`Notified ${item.email} for report id ${item.id}`);
      } catch (err) {
        console.error('Error sending/updating for item', item.id, err);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ notified: items.length }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
