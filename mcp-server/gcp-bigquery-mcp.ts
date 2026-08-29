import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { queryBillingExport } from './lib/bigquery-billing.js';

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'gcp-bigquery-mcp',
      version: '1.0.0',
    },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'query_billing_export',
    {
      description:
        'Query a GCP billing export table in BigQuery and return a monthly month/cost/credit summary.',
      inputSchema: z.object({
        projectId: z.string().min(1),
        datasetId: z.string().min(1),
        billingAccountId: z.string().min(1),
        maxResults: z.number().int().positive().max(10000).optional(),
        resourceExport: z.boolean().optional(),
      }),
    },
    async ({ projectId, datasetId, billingAccountId, maxResults, resourceExport }) => {
      const data = await queryBillingExport({
        projectId,
        datasetId,
        billingAccountId,
        maxResults,
        resourceExport,
      });

      return {
        content: [{ type: 'text', text: jsonText(data) }],
        structuredContent: data,
      };
    },
  );

  return server;
}

void serveStdio(createServer);
console.error('gcp bigquery MCP server running on stdio');
