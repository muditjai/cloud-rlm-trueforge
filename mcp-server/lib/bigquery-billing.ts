import { BigQuery } from '@google-cloud/bigquery';

export interface BigQueryQueryInput {
  sql: string;
  params?: Record<string, unknown> | unknown[];
  projectId?: string;
  location?: string;
  maxResults?: number;
  dryRun?: boolean;
}

export interface BigQueryQueryResult {
  rows: Record<string, unknown>[];
  jobId?: string;
  cacheHit?: boolean;
  totalBytesProcessed?: string;
  slotMillis?: string;
  query: string;
}

export interface BillingExportQueryInput {
  projectId: string;
  datasetId: string;
  billingAccountId: string;
  startDate: string;
  endDate: string;
  maxResults?: number;
  resourceExport?: boolean;
}

export interface BillingExportQueryResult extends BigQueryQueryResult {
  tableName: string;
}

function sanitizeForJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeBillingAccountId(billingAccountId: string): string {
  return billingAccountId.trim().replace(/^billingAccounts\//, '').replace(/-/g, '_');
}

function resolveBillingExportTableName(input: BillingExportQueryInput): string {
  const accountId = normalizeBillingAccountId(input.billingAccountId);
  const variant = input.resourceExport ? 'resource_v1' : 'v1';
  return `\`${input.projectId}.${input.datasetId}.gcp_billing_export_${variant}_${accountId}\``;
}

function buildBillingExportQuery(input: BillingExportQueryInput): string {
  const tableName = resolveBillingExportTableName(input);

  return `
    SELECT
      service,
      sku,
      usage_start_time,
      usage_end_time,
      project,
      cost,
      currency,
      resource
    FROM ${tableName}
    WHERE _PARTITIONDATE >= @startDate
      AND _PARTITIONDATE <= @endDate
    ORDER BY usage_start_time DESC
    LIMIT @limit
  `;
}

export async function runBigQueryQuery(input: BigQueryQueryInput): Promise<BigQueryQueryResult> {
  const bigquery = new BigQuery(
    input.projectId ? { projectId: input.projectId } : undefined,
  );

  const [rows, job] = await bigquery.query({
    query: input.sql,
    params: input.params,
    location: input.location,
    maxResults: input.maxResults,
    dryRun: input.dryRun,
    wrapIntegers: true,
    parseJSON: true,
  });

  const metadata = ((job as any).metadata ?? {}) as Record<string, any>;
  const statistics = (metadata.statistics ?? {}) as Record<string, any>;
  const queryStats = (statistics.query ?? {}) as Record<string, any>;

  return {
    rows: sanitizeForJson(rows) as Record<string, unknown>[],
    jobId: job.id ?? undefined,
    cacheHit: queryStats.cacheHit ?? undefined,
    totalBytesProcessed: queryStats.totalBytesProcessed ?? undefined,
    slotMillis: queryStats.slotMillis ?? undefined,
    query: input.sql,
  };
}

export async function queryBillingExport(input: BillingExportQueryInput): Promise<BillingExportQueryResult> {
  const sql = buildBillingExportQuery(input);
  const result = await runBigQueryQuery({
    projectId: input.projectId,
    sql,
    params: {
      startDate: input.startDate,
      endDate: input.endDate,
      limit: input.maxResults ?? 100,
    },
    maxResults: input.maxResults ?? 100,
  });

  return {
    ...result,
    tableName: resolveBillingExportTableName(input),
  };
}
