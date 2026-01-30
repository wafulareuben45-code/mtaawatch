# MTW Report API — accept reports and store in DynamoDB

## Overview

This AWS Lambda is an example API (behind API Gateway) that accepts POSTed report objects and writes them to DynamoDB. Use this to store reports centrally so the scheduled SendGrid Lambda can send follow-up emails.

Expected payload (JSON)
{
  "email": "<user@example.com>",
  "title": "Pothole on 5th st",
  "description": "Large pothole near the market",
  "location": "5th Street",
  "department": "environment"
}

Environment

- `TABLE_NAME` - DynamoDB table name (default MTWReports)
- `AWS_REGION`

Deploy

1. Zip code + node_modules after `npm install`.
2. Create Lambda and attach API Gateway POST /reports to it.
3. Ensure Lambda role has permission to PutItem into DynamoDB.

Client integration

- Change client code to POST to the API Gateway endpoint instead of (or in addition to) saving to localStorage. Example fetch:

```js
fetch('https://your-api.execute-api.region.amazonaws.com/prod/reports', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(reportData)
})
```

After this, the scheduled SendGrid Lambda will be able to find reports older than 7 days and send notifications.
