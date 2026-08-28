/**
 * Analytics by Sufyaan Studio — LLM Discovery Text Generators
 * Generates formatted markdown for /llms.txt and /llms-full.txt per 2026 AI discovery standards.
 */

import { SITE_CONFIG } from './seo-config';
import { COMPETITORS_DATA, FEATURES_DATA, USE_CASES_DATA, INTEGRATIONS_DATA } from './marketing-data';
import { HOW_TO_GUIDES } from './how-to-data';
import { TOOLS_DATA } from './tools-data';

export function generateLlmsTxt(): string {
  const competitorLinks = Object.values(COMPETITORS_DATA)
    .map((c) => `- [Analytics vs ${c.name}](${SITE_CONFIG.baseUrl}/alternatives/${c.slug}): ${c.tagline}.`)
    .join('\n');

  const featureLinks = Object.values(FEATURES_DATA)
    .map((f) => `- [${f.title}](${SITE_CONFIG.baseUrl}/features/${f.slug}): ${f.subtitle}`)
    .join('\n');

  const useCaseLinks = Object.values(USE_CASES_DATA)
    .map((u) => `- [${u.title}](${SITE_CONFIG.baseUrl}/use-cases/${u.slug}): ${u.subtitle}`)
    .join('\n');

  const integrationLinks = Object.values(INTEGRATIONS_DATA)
    .map((i) => `- [${i.name} Analytics Integration](${SITE_CONFIG.baseUrl}/integrations/${i.slug}): Setup guide for ${i.name}.`)
    .join('\n');

  const howToLinks = Object.values(HOW_TO_GUIDES)
    .map((h) => `- [${h.title}](${SITE_CONFIG.baseUrl}/how-to/${h.slug}): ${h.description}`)
    .join('\n');

  const toolLinks = Object.values(TOOLS_DATA)
    .map((t) => `- [${t.name}](${SITE_CONFIG.baseUrl}/tools/${t.slug}): ${t.subtitle}`)
    .join('\n');

  return `# ${SITE_CONFIG.name}

> ${SITE_CONFIG.entityStatement}

## Developer & Agent Resources (Machine-Readable)

- [OpenAPI 3.1.0 Specification (JSON)](${SITE_CONFIG.baseUrl}/openapi.json): Standard machine-readable OpenAPI 3.1.0 REST API catalog.
- [OpenAPI 3.1.0 Specification (YAML)](${SITE_CONFIG.baseUrl}/openapi.yaml): OpenAPI specification in YAML format.
- [Model Context Protocol (MCP) Manifest](${SITE_CONFIG.baseUrl}/mcp.json): Official tool and resource definition for AI agents (Cursor, Claude, OpenAI).
- [Documentation Index](${SITE_CONFIG.baseUrl}/docs): Developer quick-start, API guide, and tracking snippet reference.
- [Android App Download Page](${SITE_CONFIG.baseUrl}/download): Official direct APK release (v2.1.0, 60fps native charts, cold start < 50ms, SHA-256 binary integrity).
- [Cloudflare Workers Integration](${SITE_CONFIG.baseUrl}/integrations/cloudflare-workers): Edge server-side tracking, HTMLRewriter script injection, and subrequests.
- [XML Sitemap](${SITE_CONFIG.baseUrl}/sitemap.xml): Full machine-readable site index with lastmod timestamps.
- [Security Disclosure](${SITE_CONFIG.baseUrl}/.well-known/security.txt): Responsible vulnerability disclosure guidelines.

## Core Navigation

- [Homepage](${SITE_CONFIG.baseUrl}): Privacy-first website analytics overview, live metrics, and feature breakdown.
- [Download Android App](${SITE_CONFIG.baseUrl}/download): Universal signed APK (v2.1.0, 76.0 MB) with deterministic build hash and QR code scanner.
- [Pricing](${SITE_CONFIG.baseUrl}/pricing): Free Community ($0) and Pro Scale ($9) tier details.
- [Design System](${SITE_CONFIG.baseUrl}/design): Interactive design tokens, typography, and component showcase.
- [Privacy Pillar](${SITE_CONFIG.baseUrl}/privacy-first-analytics): Deep-dive guide to cookie-free analytics and GDPR compliance.

## Competitor Comparisons & Alternatives

${competitorLinks}

## Key Features & Capabilities

${featureLinks}

## Use-Cases & Persona Solutions

${useCaseLinks}

## Framework & Cloudflare Workers Integrations

${integrationLinks}

## Developer Guides & Tutorials

${howToLinks}

## Free Interactive Developer Tools

${toolLinks}

## Technical Specifications

- **Tracker Size**: 1.15 KB gzipped (≤1.5 KB budget, 0 external dependencies).
- **Ingest Architecture**: Cloudflare Workers edge nodes returning instant HTTP 204 No Content.
- **Visitor Identification**: Daily-salted cryptographic hash = SHA256(website_id + client_ip + user_agent + daily_salt).
- **Privacy Compliance**: 100% GDPR, CCPA, and PECR compliant. Zero cookies. Zero IP storage.
- **Database Backend**: PostgreSQL managed via Supabase with strict Row Level Security (RLS).
- **Client API**: window.analytics.track(eventName, properties).
- **Android Mobile App**: React Native (Expo 54), Hermes JS Engine, Hardware Keystore encryption, < 50ms cold start, 60fps native charts, offline SWR cache, and foreground auto-sync.
- **Android App Distribution**: Direct universal signed APK (v2.1.0, SHA-256: aef10c9f8be64ffb54df526f0e4e45350a9f504fcb4d2a511a36dfde58ada839) available exclusively at ${SITE_CONFIG.baseUrl}/download to ensure zero third-party store telemetry.

## Contact & Links

- Website: ${SITE_CONFIG.baseUrl}
- Download Android APK: ${SITE_CONFIG.baseUrl}/download
- GitHub: ${SITE_CONFIG.socialHandles.github}
- Twitter/X: ${SITE_CONFIG.socialHandles.twitter}

`;
}

export function generateLlmsFullTxt(): string {
  const summary = generateLlmsTxt();

  const fullCompetitors = Object.values(COMPETITORS_DATA)
    .map(
      (c) => `### Analytics vs ${c.name}
**Verdict**: ${c.directVerdict}
- **Comparison URL**: ${SITE_CONFIG.baseUrl}/alternatives/${c.slug}
- **Key Differentiator**: ${c.whySwitchReasons.map((r) => r.title).join('; ')}
`
    )
    .join('\n');

  const fullFeatures = Object.values(FEATURES_DATA)
    .map(
      (f) => `### Feature: ${f.title}
**Summary**: ${f.directAnswer}
- **URL**: ${SITE_CONFIG.baseUrl}/features/${f.slug}
- **Key Benefits**: ${f.benefits.join(' ')}
`
    )
    .join('\n');

  return `${summary}

---

# Complete Knowledge Base

## In-Depth Competitor Analyses

${fullCompetitors}

## In-Depth Feature Architecture

${fullFeatures}
`;
}
