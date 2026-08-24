/**
 * Analytics by Sufyaan Studio — Markdown Mirror Generator
 * Provides clean, noise-free Markdown renderings of pages for AI agents and LLM scrapers.
 * Fully compliant with acceptmarkdown.com content negotiation standards.
 */

import { SITE_CONFIG } from './seo-config';
import { COMPETITORS_DATA, FEATURES_DATA, USE_CASES_DATA, INTEGRATIONS_DATA } from './marketing-data';
import { HOW_TO_GUIDES } from './how-to-data';
import { TOOLS_DATA } from './tools-data';

export function get404Markdown(requestedPath = ''): string {
  return `# 404 Not Found

The requested resource \`${requestedPath || 'unknown'}\` does not exist on **${SITE_CONFIG.name}**.

## Where to Look Next (Agent Recovery Links)
- **Machine-Readable API Spec**: [${SITE_CONFIG.baseUrl}/openapi.json](${SITE_CONFIG.baseUrl}/openapi.json)
- **Model Context Protocol (MCP)**: [${SITE_CONFIG.baseUrl}/mcp.json](${SITE_CONFIG.baseUrl}/mcp.json)
- **LLM Index & Sitemap**: [${SITE_CONFIG.baseUrl}/llms.txt](${SITE_CONFIG.baseUrl}/llms.txt) & [${SITE_CONFIG.baseUrl}/sitemap.xml](${SITE_CONFIG.baseUrl}/sitemap.xml)
- **Comprehensive AI Context**: [${SITE_CONFIG.baseUrl}/llms-full.txt](${SITE_CONFIG.baseUrl}/llms-full.txt)
- **Developer Documentation**: [${SITE_CONFIG.baseUrl}/docs](${SITE_CONFIG.baseUrl}/docs)
- **Features & Architecture**: [${SITE_CONFIG.baseUrl}/features](${SITE_CONFIG.baseUrl}/features)
- **Competitor Comparisons**: [${SITE_CONFIG.baseUrl}/alternatives](${SITE_CONFIG.baseUrl}/alternatives)
- **Platform Integrations**: [${SITE_CONFIG.baseUrl}/integrations](${SITE_CONFIG.baseUrl}/integrations)
- **Developer Tutorials**: [${SITE_CONFIG.baseUrl}/how-to](${SITE_CONFIG.baseUrl}/how-to)
- **Interactive Tools**: [${SITE_CONFIG.baseUrl}/tools](${SITE_CONFIG.baseUrl}/tools)
- **Privacy Architecture**: [${SITE_CONFIG.baseUrl}/privacy-first-analytics](${SITE_CONFIG.baseUrl}/privacy-first-analytics)
`;
}

export function getMarkdownForRoute(slugs: string[]): string | null {
  if (!slugs || slugs.length === 0) {
    return `# ${SITE_CONFIG.name}

> ${SITE_CONFIG.entityStatement}

- **Website**: ${SITE_CONFIG.baseUrl}
- **Tracker**: 1.15 KB gzipped, 0 dependencies, 100% cookie-free.
- **Ingestion**: Cloudflare Workers edge nodes (< 50ms global latency).
- **Database**: PostgreSQL on Supabase with Row Level Security.
- **Pricing**: Community Free Tier ($0, 25k events/mo) and Pro Scale ($9/mo, 250k events/mo).

## Developer Resources
- **OpenAPI 3.1.0**: [${SITE_CONFIG.baseUrl}/openapi.json](${SITE_CONFIG.baseUrl}/openapi.json)
- **MCP Server**: [${SITE_CONFIG.baseUrl}/mcp.json](${SITE_CONFIG.baseUrl}/mcp.json)
- **Cloudflare Workers Integration**: [${SITE_CONFIG.baseUrl}/integrations/cloudflare-workers](${SITE_CONFIG.baseUrl}/integrations/cloudflare-workers)
- **LLM Index**: [${SITE_CONFIG.baseUrl}/llms.txt](${SITE_CONFIG.baseUrl}/llms.txt)
- **Full Context**: [${SITE_CONFIG.baseUrl}/llms-full.txt](${SITE_CONFIG.baseUrl}/llms-full.txt)
`;
  }

  const [section, sub] = slugs;

  if (section === 'pricing') {
    return `# Pricing & Plans — ${SITE_CONFIG.name}

> Transparent, budget-friendly, and predictable pricing for websites and SaaS apps of any scale.

## Available Plans
- **Community Free Tier ($0 / month)**: 25,000 monthly events, unlimited websites, 30 days detailed logs + forever monthly rollups, realtime traffic monitor, public shareable dashboards.
- **Pro Scale ($9 / month)**: 250,000 monthly events, unlimited websites, 1 year granular data retention, raw event exports, priority edge compute routing.

[Sign Up for Free](${SITE_CONFIG.baseUrl}/login)
`;
  }

  if (section === 'docs') {
    return `# Developer Documentation — ${SITE_CONFIG.name}

> Quick start integration guides, API endpoints, custom conversion tracking, and architecture documentation.

## Quick Start (Frontend Script)
Add the tracking tag to your HTML or root layout:
\`\`\`html
<script defer src="${SITE_CONFIG.baseUrl}/t.js" data-web="YOUR_WEBSITE_UUID"></script>
\`\`\`

## Edge Server Ingestion (Cloudflare Workers, Node.js, Python)
\`\`\`http
POST https://analytics-collect.sufyaanstudio.workers.dev/api/send
Content-Type: application/json

{
  "w": "YOUR_WEBSITE_UUID",
  "u": "/pricing",
  "r": "https://google.com",
  "n": "custom_event_name",
  "p": { "plan": "pro" }
}
\`\`\`

## Developer Resources
- **OpenAPI 3.1.0**: [${SITE_CONFIG.baseUrl}/openapi.json](${SITE_CONFIG.baseUrl}/openapi.json)
- **MCP Tool Manifest**: [${SITE_CONFIG.baseUrl}/mcp.json](${SITE_CONFIG.baseUrl}/mcp.json)
- **Framework Guides**: [${SITE_CONFIG.baseUrl}/integrations](${SITE_CONFIG.baseUrl}/integrations)
`;
  }

  if (section === 'privacy-first-analytics') {
    return `# Privacy-First & Cookie-Free Website Analytics (2026 Guide)

> The definitive technical and legal guide to tracking website metrics without cookie banners, IP logging, or GDPR liabilities.

## Key Privacy Guarantees
1. **Zero Client Cookies**: No cookies, localStorage identifiers, or device fingerprinting.
2. **Daily-Salted Anonymization**: Visitor hashes are generated via \`sha256(website_id + ip + user_agent + daily_salt)\`. Salt changes daily at 00:00 UTC.
3. **Edge IP Drop**: Raw IP addresses are immediately stripped at Cloudflare edge nodes after geographic resolution.
4. **GDPR & ePrivacy Exemption**: Full compliance with EU Article 5.3 and GDPR without requiring user consent banners.
`;
  }

  if (section === 'alternatives' || section === 'vs') {
    if (!sub) {
      return `# Competitor Alternatives — ${SITE_CONFIG.name}

${Object.values(COMPETITORS_DATA)
  .map((c) => `## ${c.name}\n${c.directVerdict}\n[Read Full Comparison](${SITE_CONFIG.baseUrl}/alternatives/${c.slug})`)
  .join('\n\n')}`;
    }
    const c = COMPETITORS_DATA[sub];
    if (!c) return null;
    return `# Analytics by Sufyaan Studio vs ${c.name}

> **Verdict**: ${c.directVerdict}

## Why Teams Choose Analytics
${c.whySwitchReasons.map((r) => `- **${r.title}**: ${r.description}`).join('\n')}

## Comparison Table
${c.comparisonTable.map((t) => `- **${t.feature}**: Analytics: ${t.analytics} | ${c.name}: ${t.competitor}`).join('\n')}

## Frequently Asked Questions
${c.faq.map((f) => `### ${f.question}\n${f.answer}`).join('\n\n')}
`;
  }

  if (section === 'features') {
    if (!sub) {
      return `# Features & Technical Architecture — ${SITE_CONFIG.name}

${Object.values(FEATURES_DATA)
  .map((f) => `## ${f.title}\n${f.directAnswer}\n[Explore Feature](${SITE_CONFIG.baseUrl}/features/${f.slug})`)
  .join('\n\n')}`;
    }
    const f = FEATURES_DATA[sub];
    if (!f) return null;
    return `# ${f.title}

> ${f.directAnswer}

${f.description}

## Key Benefits
${f.benefits.map((b) => `- ${b}`).join('\n')}

${f.codeExample ? `## Implementation\n\`\`\`${f.codeExample.language}\n${f.codeExample.code}\n\`\`\`` : ''}

## FAQ
${f.faq.map((q) => `### ${q.question}\n${q.answer}`).join('\n\n')}
`;
  }

  if (section === 'use-cases') {
    if (!sub) {
      return `# Analytics Solutions by Persona & Use Case — ${SITE_CONFIG.name}

${Object.values(USE_CASES_DATA)
  .map((u) => `## ${u.title}\n${u.directAnswer}\n[Explore Solution](${SITE_CONFIG.baseUrl}/use-cases/${u.slug})`)
  .join('\n\n')}`;
    }
    const u = USE_CASES_DATA[sub];
    if (!u) return null;
    return `# ${u.title}

> ${u.directAnswer}

${u.description}

## Key Benefits for ${u.persona}
${u.keyBenefits.map((b) => `- **${b.title}**: ${b.description}`).join('\n')}
`;
  }

  if (section === 'integrations') {
    if (!sub) {
      return `# Platform & Framework Integrations — ${SITE_CONFIG.name}

${Object.values(INTEGRATIONS_DATA)
  .map((i) => `## ${i.name}\n${i.directAnswer}\n[View Integration Guide](${SITE_CONFIG.baseUrl}/integrations/${i.slug})`)
  .join('\n\n')}`;
    }
    const i = INTEGRATIONS_DATA[sub];
    if (!i) return null;
    return `# ${i.name} Analytics Integration

> ${i.directAnswer}

## Installation Steps
${i.steps.map((s) => `### ${s.title}\n${s.description}\n${s.code ? `\`\`\`${s.language || 'html'}\n${s.code}\n\`\`\`` : ''}`).join('\n\n')}
`;
  }

  if (section === 'how-to') {
    if (!sub) {
      return `# Developer Tutorials & Guides — ${SITE_CONFIG.name}

${Object.values(HOW_TO_GUIDES)
  .map((h) => `## ${h.title}\n${h.directAnswer}\n[Read Tutorial](${SITE_CONFIG.baseUrl}/how-to/${h.slug})`)
  .join('\n\n')}`;
    }
    const h = HOW_TO_GUIDES[sub];
    if (!h) return null;
    return `# ${h.title}

> ${h.directAnswer}

${h.steps.map((s) => `## ${s.name}\n${s.text}\n${s.code ? `\`\`\`${s.language || 'javascript'}\n${s.code}\n\`\`\`` : ''}`).join('\n\n')}
`;
  }

  if (section === 'tools') {
    if (!sub) {
      return `# Free Developer Tools — ${SITE_CONFIG.name}

${Object.values(TOOLS_DATA)
  .map((t) => `## ${t.name}\n${t.directAnswer}\n[Use Tool](${SITE_CONFIG.baseUrl}/tools/${t.slug})`)
  .join('\n\n')}`;
    }
    const t = TOOLS_DATA[sub];
    if (!t) return null;
    return `# ${t.name}

> ${t.directAnswer}

${t.description}

## Key Capabilities
${t.features.map((feat) => `- ${feat}`).join('\n')}
`;
  }

  return null;
}
