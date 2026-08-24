/**
 * Analytics by Sufyaan Studio — Markdown Mirror Generator
 * Provides clean, noise-free Markdown renderings of pages for AI agents and LLM scrapers.
 */

import { SITE_CONFIG } from './seo-config';
import { COMPETITORS_DATA, FEATURES_DATA, USE_CASES_DATA, INTEGRATIONS_DATA } from './marketing-data';
import { HOW_TO_GUIDES } from './how-to-data';
import { TOOLS_DATA } from './tools-data';

export function getMarkdownForRoute(slugs: string[]): string | null {
  if (!slugs || slugs.length === 0) {
    return `# ${SITE_CONFIG.name}

> ${SITE_CONFIG.entityStatement}

- **Website**: ${SITE_CONFIG.baseUrl}
- **Tracker**: 1.15 KB gzipped, 0 dependencies, 100% cookie-free.
- **Ingestion**: Cloudflare Workers edge nodes (< 50ms latency).
- **Database**: PostgreSQL on Supabase with Row Level Security.
- **Pricing**: Community Free Tier ($0, 25k events/mo) and Pro Scale ($9/mo, 250k events/mo).
`;
  }

  const [section, sub] = slugs;

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
      return `# Features — ${SITE_CONFIG.name}

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
    const i = INTEGRATIONS_DATA[sub];
    if (!i) return null;
    return `# ${i.name} Analytics Integration

> ${i.directAnswer}

## Installation Steps
${i.steps.map((s) => `### ${s.title}\n${s.description}\n${s.code ? `\`\`\`${s.language || 'html'}\n${s.code}\n\`\`\`` : ''}`).join('\n\n')}
`;
  }

  if (section === 'how-to') {
    const h = HOW_TO_GUIDES[sub];
    if (!h) return null;
    return `# ${h.title}

> ${h.directAnswer}

${h.steps.map((s) => `## ${s.name}\n${s.text}\n${s.code ? `\`\`\`${s.language || 'javascript'}\n${s.code}\n\`\`\`` : ''}`).join('\n\n')}
`;
  }

  if (section === 'tools') {
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
