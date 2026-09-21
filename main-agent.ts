
import { TrueForge } from '@truefoundry/trueforge-sdk';
import process from 'node:process';

const client = new TrueForge({
  baseUrl: process.env.TRUEFORGE_BASE_URL ?? 'http://localhost:8790',
  timeoutInSeconds: 600,
});

const billingMcpServerName = process.env.TRUEFORGE_BILLING_MCP_SERVER ?? 'gcp-bigquery-mcp';

// Open a session with an inline agent (no saved agent needed).
const { data: session } = await client.sessions.create({
  agent: {
    spec: {
      model: { name: 'openai/gpt-5-4-mini' }, // a model you configured in Settings
      instructions:
        'You are a concise, helpful assistant. You have access to a billing export MCP server for GCP cost analysis.',
      mcpServers: [
        {
          name: billingMcpServerName,
          enableTools: ['query_billing_export'],
          preload: true,
        },
      ],
    },
  },
});

// Stream one turn and print the reply token by token.
const stream = await client.sessions.createTurnStream(session.id, {
  input: [
    {
      type: 'user.message',
      content:
        'In two sentences, explain what the attached GCP billing export MCP tool is for and what it returns.',
    },
  ],
});

for await (const { data: event } of stream.withMetadata()) {
  if (event.type === 'model.message.delta') process.stdout.write(event.content ?? '');
  if (event.type === 'turn.done') console.log('\n\nstatus:', event.state.status);
}
