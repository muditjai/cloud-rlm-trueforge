import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { GoogleAuth } from 'google-auth-library';
import * as z from 'zod/v4';
import process from 'node:process';

const CLOUD_BILLING_SCOPE = 'https://www.googleapis.com/auth/cloud-billing.readonly';
const CLOUD_BILLING_API_BASE = 'https://cloudbilling.googleapis.com/v1';

const auth = new GoogleAuth({
  scopes: [CLOUD_BILLING_SCOPE],
});

type QueryValue = string | number | undefined;

function stripResourcePrefix(value: string, prefix: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith(`${prefix}/`) ? trimmed.slice(prefix.length + 1) : trimmed;
}

function asBillingAccountId(name: string): string {
  return stripResourcePrefix(name, 'billingAccounts');
}

function asProjectId(name: string): string {
  return stripResourcePrefix(name, 'projects');
}

function toQueryString(params: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    query.set(key, String(value));
  }
  const rendered = query.toString();
  return rendered ? `?${rendered}` : '';
}

async function getAccessToken(): Promise<string> {
  const explicitToken = process.env.GCP_BILLING_ACCESS_TOKEN;
  if (explicitToken) {
    return explicitToken;
  }

  const token = await auth.getAccessToken();
  if (!token) {
    throw new Error(
      'Unable to acquire a Google Cloud access token. Set GCP_BILLING_ACCESS_TOKEN or configure Application Default Credentials.',
    );
  }

  return token;
}

async function requestBillingApi<T>(path: string): Promise<T> {
  const response = await fetch(`${CLOUD_BILLING_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      Accept: 'application/json',
    },
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Cloud Billing API request failed (${response.status} ${response.statusText}) for ${path}: ${bodyText}`,
    );
  }

  return JSON.parse(bodyText) as T;
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'gcp-billing-account-mcp',
      version: '1.0.0',
    },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'list_billing_accounts',
    {
      description: 'List Cloud Billing accounts visible to the authenticated Google Cloud principal.',
      inputSchema: z.object({
        pageSize: z.number().int().positive().max(100).optional(),
        pageToken: z.string().optional(),
        filter: z.string().optional(),
        parent: z.string().optional(),
      }),
    },
    async ({ pageSize, pageToken, filter, parent }) => {
      const data = await requestBillingApi<Record<string, unknown>>(
        `/billingAccounts${toQueryString({ pageSize, pageToken, filter, parent })}`,
      );

      return {
        content: [{ type: 'text', text: jsonText(data) }],
        structuredContent: data,
      };
    },
  );

  server.registerTool(
    'get_billing_account',
    {
      description: 'Get details for a single Cloud Billing account.',
      inputSchema: z.object({
        name: z.string().min(1),
      }),
    },
    async ({ name }) => {
      const billingAccountId = encodeURIComponent(asBillingAccountId(name));
      const data = await requestBillingApi<Record<string, unknown>>(`/billingAccounts/${billingAccountId}`);

      return {
        content: [{ type: 'text', text: jsonText(data) }],
        structuredContent: data,
      };
    },
  );

  server.registerTool(
    'list_billing_account_projects',
    {
      description: 'List Google Cloud projects associated with a Cloud Billing account.',
      inputSchema: z.object({
        name: z.string().min(1),
        pageSize: z.number().int().positive().max(100).optional(),
        pageToken: z.string().optional(),
      }),
    },
    async ({ name, pageSize, pageToken }) => {
      const billingAccountId = encodeURIComponent(asBillingAccountId(name));
      const data = await requestBillingApi<Record<string, unknown>>(
        `/billingAccounts/${billingAccountId}/projects${toQueryString({ pageSize, pageToken })}`,
      );

      return {
        content: [{ type: 'text', text: jsonText(data) }],
        structuredContent: data,
      };
    },
  );

  server.registerTool(
    'get_project_billing_info',
    {
      description: 'Get billing information for a Google Cloud project.',
      inputSchema: z.object({
        name: z.string().min(1),
      }),
    },
    async ({ name }) => {
      const projectId = encodeURIComponent(asProjectId(name));
      const data = await requestBillingApi<Record<string, unknown>>(`/projects/${projectId}/billingInfo`);

      return {
        content: [{ type: 'text', text: jsonText(data) }],
        structuredContent: data,
      };
    },
  );

  return server;
}

void serveStdio(createServer);
console.error('gcp billing MCP server running on stdio');
