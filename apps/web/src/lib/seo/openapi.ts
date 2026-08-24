/**
 * Analytics by Sufyaan Studio — OpenAPI 3.1.0 Specification Generator
 */

import { SITE_CONFIG } from './seo-config';

export function getOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Analytics by Sufyaan Studio API',
      version: '1.0.0',
      description:
        'Official API specification for Analytics by Sufyaan Studio — high-performance, privacy-first, cookie-free website analytics with Cloudflare Workers edge ingestion and Supabase PostgreSQL storage.',
      contact: {
        name: 'Sufyaan Studio Engineering',
        url: `${SITE_CONFIG.baseUrl}/docs`,
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: SITE_CONFIG.baseUrl,
        description: 'Primary Web Application & Query API',
      },
      {
        url: 'https://analytics-collect.sufyaanstudio.workers.dev',
        description: 'Global Edge Event Ingestion Worker (Cloudflare)',
      },
    ],
    paths: {
      '/api/send': {
        post: {
          summary: 'Ingest Analytics Event or Pageview',
          description:
            'Record an anonymous, cookie-free pageview or custom conversion event. Processed at Cloudflare edge with daily-salted visitor hashing.',
          operationId: 'ingestEvent',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/EventPayload',
                },
              },
            },
          },
          responses: {
            '204': {
              description: 'Event accepted and buffered successfully (No Content)',
            },
            '400': {
              description: 'Invalid event payload or missing website UUID',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '429': {
              description: 'Rate limit exceeded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/c': {
        post: {
          summary: 'Compact Tracker Ingestion Endpoint',
          description: 'Alias endpoint optimized for lightweight client-side sendBeacon transmissions.',
          operationId: 'compactSendBeacon',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventPayload' },
              },
            },
          },
          responses: {
            '204': { description: 'Event recorded successfully' },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/indexnow': {
        get: {
          summary: 'Get IndexNow Key Verification File',
          description: 'Serves the IndexNow verification key for Bing, Yandex, and search engine crawlers.',
          operationId: 'getIndexNowKey',
          responses: {
            '200': {
              description: 'IndexNow Key Text',
              content: {
                'text/plain': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
        post: {
          summary: 'Submit URLs to Search Engines via IndexNow',
          description: 'Submit updated website URLs for instant search engine indexing across Bing, Naver, Seznam, and Yandex.',
          operationId: 'submitIndexNow',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    urlList: {
                      type: 'array',
                      items: { type: 'string', format: 'uri' },
                      description: 'List of updated URLs to submit for immediate crawling',
                    },
                  },
                  required: ['urlList'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'URLs submitted to IndexNow successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      submittedCount: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid URL list payload',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/openapi.json': {
        get: {
          summary: 'OpenAPI 3.1.0 Specification (JSON)',
          description: 'Returns the machine-readable OpenAPI specification in JSON format for automated agent tooling.',
          operationId: 'getOpenApiJson',
          responses: {
            '200': {
              description: 'OpenAPI 3.1.0 specification',
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      },
      '/openapi.yaml': {
        get: {
          summary: 'OpenAPI 3.1.0 Specification (YAML)',
          description: 'Returns the machine-readable OpenAPI specification in YAML format.',
          operationId: 'getOpenApiYaml',
          responses: {
            '200': {
              description: 'OpenAPI 3.1.0 YAML specification',
              content: {
                'text/yaml': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
      '/mcp.json': {
        get: {
          summary: 'Model Context Protocol (MCP) Tool Manifest',
          description: 'Returns the MCP server tool and resource manifest for AI agents (Claude, Cursor, Perplexity, OpenAI).',
          operationId: 'getMcpManifest',
          responses: {
            '200': {
              description: 'MCP Server Manifest',
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      },
      '/llms.txt': {
        get: {
          summary: 'LLMs Discovery File',
          description: 'Standard llms.txt index linking to documentation, machine-readable mirrors, and developer APIs.',
          operationId: 'getLlmsTxt',
          responses: {
            '200': {
              description: 'Plaintext LLM Discovery Manifest',
              content: {
                'text/plain': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
      '/llms-full.txt': {
        get: {
          summary: 'Full LLM Context Dump',
          description: 'Comprehensive markdown knowledge base containing complete comparison matrices, feature guides, and tutorials.',
          operationId: 'getLlmsFullTxt',
          responses: {
            '200': {
              description: 'Comprehensive Markdown Knowledge Dump',
              content: {
                'text/plain': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        EventPayload: {
          type: 'object',
          required: ['w', 'u'],
          properties: {
            w: {
              type: 'string',
              format: 'uuid',
              description: 'Target website UUID',
              example: 'b5f21e5e-6e27-4a7b-8910-bc11de23f456',
            },
            u: {
              type: 'string',
              description: 'Current page pathname and search query',
              example: '/pricing?utm_source=twitter',
            },
            n: {
              type: 'string',
              maxLength: 128,
              description: 'Custom conversion event name (optional; omitted for default pageview)',
              example: 'signup_completed',
            },
            r: {
              type: 'string',
              description: 'Inbound referrer URL',
              example: 'https://news.ycombinator.com/',
            },
            p: {
              type: 'object',
              additionalProperties: true,
              description: 'Custom event metadata payload (up to 2 KB JSON)',
              example: { plan: 'pro', amount: 9, currency: 'USD' },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: {
                  type: 'string',
                  description: 'Machine-readable uppercase error code',
                  example: 'INVALID_WEBSITE_ID',
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error description',
                  example: 'The provided website UUID is missing or invalid.',
                },
                hint: {
                  type: 'string',
                  description: 'Actionable guidance for autonomous AI agents or developers to recover',
                  example: 'Ensure "w" is a valid UUID format (e.g., xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx).',
                },
                docs_url: {
                  type: 'string',
                  format: 'uri',
                  description: 'Reference link to the relevant developer documentation',
                  example: 'https://analytics.sufyaanstudio.workers.dev/docs',
                },
                status: {
                  type: 'integer',
                  description: 'HTTP status code',
                  example: 400,
                },
              },
            },
          },
        },
      },
    },
  };
}

export function getOpenApiYaml(): string {
  const json = getOpenApiSpec();
  // Clean JSON-to-YAML converter for standard OpenAPI specification
  return jsonToYaml(json);
}

function jsonToYaml(obj: any, indent = 0): string {
  const spaces = ' '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(': ') || obj.startsWith('@') || obj.includes('#')) {
      return `"${obj.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return obj;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const itemYaml = jsonToYaml(item, indent + 2);
          const lines = itemYaml.split('\n');
          const firstLine = lines[0].trimStart();
          const restLines = lines.slice(1).map((l) => `${spaces}  ${l}`).join('\n');
          return `${spaces}- ${firstLine}${restLines ? '\n' + restLines : ''}`;
        }
        return `${spaces}- ${jsonToYaml(item, indent + 2)}`;
      })
      .join('\n');
  }

  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  return entries
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${spaces}${key}:\n${jsonToYaml(value, indent + 2)}`;
      }
      return `${spaces}${key}: ${jsonToYaml(value, indent + 2)}`;
    })
    .join('\n');
}
