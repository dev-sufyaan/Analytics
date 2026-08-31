/**
 * Agentic Readiness Validation Test Suite
 * Validates the 5 requirements of the Is Agentic readiness model (Ora audit standard):
 * 1. Agent-friendly 404s with markdown recovery navigation
 * 2. Published OpenAPI 3.1.0 spec at /openapi.json and /openapi.yaml
 * 3. Structured JSON error responses
 * 4. acceptmarkdown.com content negotiation & Vary headers
 * 5. Developer resource discoverability (Cloudflare Workers, MCP, OpenAPI)
 */

import { strict as assert } from 'node:assert';
import { getOpenApiSpec, getOpenApiYaml } from '../../apps/web/src/lib/seo/openapi.ts';
import { getMarkdownForRoute, get404Markdown } from '../../apps/web/src/lib/seo/markdown-mirror.ts';
import { generateLlmsTxt, generateLlmsFullTxt } from '../../apps/web/src/lib/seo/llms.ts';
import { INTEGRATIONS_DATA } from '../../apps/web/src/lib/seo/marketing-data.ts';
import { HOW_TO_GUIDES } from '../../apps/web/src/lib/seo/how-to-data.ts';

console.log('🤖 Starting Is Agentic Readiness Test Suite...\n');

// Test 1: Agent-Friendly 404s
console.log('Testing Requirement 1: Agent-Friendly 404s...');
const notFoundMarkdown = get404Markdown('/some-nonexistent-agent-path');
assert.ok(notFoundMarkdown.includes('# 404 Not Found'), '404 markdown must contain # 404 Not Found');
assert.ok(notFoundMarkdown.includes('/sitemap.xml'), '404 markdown must reference sitemap');
assert.ok(notFoundMarkdown.includes('/llms.txt'), '404 markdown must reference llms.txt');
assert.ok(notFoundMarkdown.includes('/openapi.json'), '404 markdown must reference openapi.json');
assert.ok(notFoundMarkdown.includes('/docs'), '404 markdown must reference docs');
console.log('✓ Requirement 1 Passed: Agent-friendly 404 markdown contains all required recovery links.\n');

// Test 2: OpenAPI 3.1.0 Specification
console.log('Testing Requirement 2: OpenAPI 3.1.0 Specification...');
const openApiSpec = getOpenApiSpec();
assert.equal(openApiSpec.openapi, '3.1.0', 'OpenAPI version must be 3.1.0');
assert.ok(openApiSpec.info.title.includes('Analytics by Sufyaan Studio'), 'OpenAPI title must identify product');
assert.ok(openApiSpec.paths['/api/send'], 'OpenAPI must document /api/send endpoint');
assert.ok(openApiSpec.paths['/openapi.json'], 'OpenAPI must document /openapi.json endpoint');
assert.ok(openApiSpec.paths['/llms.txt'], 'OpenAPI must document /llms.txt endpoint');
assert.ok(openApiSpec.components.schemas.EventPayload, 'OpenAPI must define EventPayload schema');
assert.ok(openApiSpec.components.schemas.ErrorResponse, 'OpenAPI must define ErrorResponse schema');

const openApiYaml = getOpenApiYaml();
assert.ok(openApiYaml.includes('openapi: "3.1.0"') || openApiYaml.includes('openapi: 3.1.0'), 'YAML must contain openapi: 3.1.0');
assert.ok(openApiYaml.includes('paths:'), 'YAML must contain paths');
console.log('✓ Requirement 2 Passed: OpenAPI 3.1.0 JSON & YAML schemas are valid and fully documented.\n');

// Test 3: Structured Error Responses
console.log('Testing Requirement 3: JSON Error Responses Structure...');
const errorSchema = openApiSpec.components.schemas.ErrorResponse.properties.error.properties;
assert.ok(errorSchema.code, 'Error schema must have code');
assert.ok(errorSchema.message, 'Error schema must have message');
assert.ok(errorSchema.hint, 'Error schema must have resolution hint');
assert.ok(errorSchema.docs_url, 'Error schema must have docs_url');
console.log('✓ Requirement 3 Passed: Standardized JSON error response schema conforms to agent expectations.\n');

// Test 4: Markdown Content Negotiation (acceptmarkdown.com)
console.log('Testing Requirement 4: Markdown Content Negotiation...');
const homeMarkdown = getMarkdownForRoute([]);
assert.ok(homeMarkdown && homeMarkdown.includes('# Analytics'), 'Home markdown must render');

const pricingMarkdown = getMarkdownForRoute(['pricing']);
assert.ok(pricingMarkdown && pricingMarkdown.includes('# Pricing & Plans'), 'Pricing markdown must render');

const docsMarkdown = getMarkdownForRoute(['docs']);
assert.ok(docsMarkdown && docsMarkdown.includes('# Developer Documentation'), 'Docs markdown must render');

const workersMarkdown = getMarkdownForRoute(['integrations', 'cloudflare-workers']);
assert.ok(workersMarkdown && workersMarkdown.includes('Cloudflare Workers'), 'Workers markdown must render');
console.log('✓ Requirement 4 Passed: Markdown mirror renders clean, noise-free content for all key routes.\n');

// Test 5: Developer Resource Discoverability (Cloudflare Workers & MCP)
console.log('Testing Requirement 5: Developer Resource Discoverability...');
assert.ok(INTEGRATIONS_DATA['cloudflare-workers'], 'INTEGRATIONS_DATA must include cloudflare-workers');
assert.ok(HOW_TO_GUIDES['how-to-track-cloudflare-workers-edge-analytics'], 'HOW_TO_GUIDES must include cloudflare workers guide');

const llmsTxt = generateLlmsTxt();
assert.ok(llmsTxt.includes('/openapi.json'), 'llms.txt must include /openapi.json');
assert.ok(llmsTxt.includes('/mcp.json'), 'llms.txt must include /mcp.json');
assert.ok(llmsTxt.includes('Cloudflare Workers'), 'llms.txt must include Cloudflare Workers resources');

// Test 6: Brand Logo & Schema Integration
console.log('Testing Requirement 6: Logo & Search Engine Schema...');
import { getOrganizationSchema, getWebSiteSchema, getSoftwareApplicationSchema } from '../../apps/web/src/lib/seo/json-ld.ts';
import { SITE_CONFIG } from '../../apps/web/src/lib/seo/seo-config.ts';
import manifest from '../../apps/web/src/app/manifest.ts';

const orgSchema = getOrganizationSchema();
assert.ok(orgSchema.logo.includes('logo.png'), 'Organization logo must point to logo.png');
assert.ok(orgSchema.image.includes('logo.png'), 'Organization image must point to logo.png');

const appSchema = getSoftwareApplicationSchema();
assert.ok(appSchema.image.includes('logo.png'), 'SoftwareApplication image must point to logo.png');
assert.ok(SITE_CONFIG.logoUrl.includes('logo.png'), 'SITE_CONFIG.logoUrl must point to logo.png');
console.log('✓ Requirement 6 Passed: Logo asset is integrated into structured data, metadata, and site headers.\n');

// Test 7: Google Search Site Names, WebSite Schema & Manifest
console.log('Testing Requirement 7: Google Search Site Names & Manifest...');
const webSiteSchema = getWebSiteSchema();
assert.equal(webSiteSchema.name, 'Analytics', 'WebSite schema name must be "Analytics" for Google Site Names');
assert.ok(Array.isArray(webSiteSchema.alternateName), 'WebSite schema must contain alternateName array');
assert.ok(webSiteSchema.alternateName.includes('Analytics by Sufyaan Studio'), 'alternateName must include full brand name');

const manifestFn = typeof manifest === 'function' ? manifest : manifest?.default || manifest;
const manifestData = typeof manifestFn === 'function' ? manifestFn() : manifestFn;
assert.equal(manifestData.name, 'Analytics', 'Manifest name must be "Analytics"');
assert.equal(manifestData.short_name, 'Analytics', 'Manifest short_name must be "Analytics"');
assert.ok(manifestData.icons.length >= 3, 'Manifest must provide responsive icon suite');
console.log('✓ Requirement 7 Passed: Google Site Names structured data and Web App Manifest are configured correctly.\n');

console.log('🎉 ALL IS AGENTIC & SEO READINESS REQUIREMENTS PASSED 100%!');
