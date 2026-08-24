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

## Core Information

- [Homepage](${SITE_CONFIG.baseUrl}): Privacy-first website analytics overview and live demo.
- [Pricing](${SITE_CONFIG.baseUrl}/pricing): Free Community ($0) and Pro Scale ($9) tier details.
- [Documentation](${SITE_CONFIG.baseUrl}/docs): Comprehensive developer integration and tracking API reference.
- [Design System](${SITE_CONFIG.baseUrl}/design): Interactive design tokens and component showcase.
- [Privacy Pillar](${SITE_CONFIG.baseUrl}/privacy-first-analytics): Deep-dive guide to cookie-free analytics and GDPR compliance.

## Competitor Comparisons & Alternatives

${competitorLinks}

## Key Features & Capabilities

${featureLinks}

## Use-Cases & Solutions

${useCaseLinks}

## Framework Integrations

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

## Contact & Links

- Website: ${SITE_CONFIG.baseUrl}
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
