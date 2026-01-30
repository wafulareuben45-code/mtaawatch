# SendGrid Lambda — scheduled follow-up emails for MTW reports

## Overview

This AWS Lambda scans `MTWReports` DynamoDB table for reports older than 7 days that are still `pending` or `in-progress` and haven't been notified yet. It sends an email via SendGrid then marks `notifySent=true`.

Environment variables (required)

- `SENDGRID_API_KEY` — SendGrid API key
- `FROM_EMAIL` — verified sender email for SendGrid
- `TABLE_NAME` — DynamoDB table name (default: MTWReports)
- `AWS_REGION` — AWS region

DynamoDB table schema (recommended)

- Table name: MTWReports
- Partition key: `id` (string)
- Attributes used: `id`, `email`, `title`, `description`, `department`, `timestamp` (ISO string), `status` (pending|in-progress|resolved|closed), `action` ('report')

Deploy steps (quick)

1. Zip `index.js` + `node_modules` (install deps locally: `npm install`).
2. Create Lambda function in AWS console or via CLI.
3. Set environment variables above in Lambda configuration.
4. Create an EventBridge rule (cron) to trigger the Lambda once per day.

Example EventBridge (daily at 08:00 UTC):

- Schedule expression: `cron(0 8 * * ? *)`

Notes

- This function expects reports to be stored in DynamoDB. You must adapt your client to POST reports to an API that writes to DynamoDB (example provided in `report-api`).
- For testing, you can run the function locally with `node index.js` but you'll need to mock env vars and AWS credentials.
