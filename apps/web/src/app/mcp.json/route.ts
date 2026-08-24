import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/seo/seo-config';

export const dynamic = 'force-static';

export async function GET() {
  const mcpManifest = {
    name: 'analytics-by-sufyaan-studio',
    version: '1.0.0',
    description:
      'Model Context Protocol (MCP) server manifest for Analytics by Sufyaan Studio — privacy-first web analytics, live traffic stats, and conversion event tracking.',
    homepage: SITE_CONFIG.baseUrl,
    tools: [
      {
        name: 'query_website_stats',
        description: 'Get total pageviews, unique visitors, bounces, and average duration for a specified website ID and date range.',
        parameters: {
          type: 'object',
          required: ['website_id'],
          properties: {
            website_id: { type: 'string', format: 'uuid', description: 'Website UUID' },
            period: { type: 'string', enum: ['today', '24h', '7d', '30d', '90d', 'all'], default: '24h' },
          },
        },
      },
      {
        name: 'get_realtime_visitors',
        description: 'Get the number of active visitors on the website in the last 5 minutes, including active pages and referrers.',
        parameters: {
          type: 'object',
          required: ['website_id'],
          properties: {
            website_id: { type: 'string', format: 'uuid', description: 'Website UUID' },
          },
        },
      },
      {
        name: 'track_custom_event',
        description: 'Dispatch a custom conversion event or milestone to the analytics edge collection engine.',
        parameters: {
          type: 'object',
          required: ['website_id', 'event_name'],
          properties: {
            website_id: { type: 'string', format: 'uuid', description: 'Website UUID' },
            event_name: { type: 'string', description: 'Custom event name (e.g. checkout_completed, lead_form_submitted)' },
            path: { type: 'string', description: 'Page path where event occurred', default: '/' },
            properties: { type: 'object', description: 'Optional JSON event properties' },
          },
        },
      },
    ],
    resources: [
      {
        uri: `${SITE_CONFIG.baseUrl}/openapi.json`,
        name: 'OpenAPI Specification',
        description: 'Complete OpenAPI 3.1.0 specification for all REST and edge endpoints',
        mimeType: 'application/json',
      },
      {
        uri: `${SITE_CONFIG.baseUrl}/llms.txt`,
        name: 'LLMs Discovery Index',
        description: 'Curated index of all documentation, comparison matrices, and tutorials',
        mimeType: 'text/plain',
      },
    ],
  };

  return NextResponse.json(mcpManifest, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      'Access-Control-Allow-Origin': '*',
      Vary: 'Accept, Accept-Encoding',
    },
  });
}
