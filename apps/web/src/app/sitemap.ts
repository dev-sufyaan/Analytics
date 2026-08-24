import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/seo/seo-config';
import { COMPETITORS_DATA, FEATURES_DATA, USE_CASES_DATA, INTEGRATIONS_DATA } from '@/lib/seo/marketing-data';
import { HOW_TO_GUIDES } from '@/lib/seo/how-to-data';
import { TOOLS_DATA } from '@/lib/seo/tools-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.baseUrl;
  const now = new Date();

  // 1. Static Core Landing & Marketing Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/privacy-first-analytics`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/alternatives`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/features`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/use-cases`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/integrations`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/how-to`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/tools`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/design`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 2. Competitor Alternatives & Comparisons
  const competitorRoutes: MetadataRoute.Sitemap = Object.values(COMPETITORS_DATA).map((c) => ({
    url: `${baseUrl}/alternatives/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.85,
  }));

  const vsRoutes: MetadataRoute.Sitemap = Object.values(COMPETITORS_DATA).map((c) => ({
    url: `${baseUrl}/vs/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // 3. Feature Deep-Dive Pages
  const featureRoutes: MetadataRoute.Sitemap = Object.values(FEATURES_DATA).map((f) => ({
    url: `${baseUrl}/features/${f.slug}`,
    lastModified: new Date(f.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // 4. Use-Case & Persona Pages
  const useCaseRoutes: MetadataRoute.Sitemap = Object.values(USE_CASES_DATA).map((u) => ({
    url: `${baseUrl}/use-cases/${u.slug}`,
    lastModified: new Date(u.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.75,
  }));

  // 5. Framework Integration Guides
  const integrationRoutes: MetadataRoute.Sitemap = Object.values(INTEGRATIONS_DATA).map((i) => ({
    url: `${baseUrl}/integrations/${i.slug}`,
    lastModified: new Date(i.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 6. How-To Tutorials
  const howToRoutes: MetadataRoute.Sitemap = Object.values(HOW_TO_GUIDES).map((h) => ({
    url: `${baseUrl}/how-to/${h.slug}`,
    lastModified: new Date(h.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 7. Free Developer Tools
  const toolRoutes: MetadataRoute.Sitemap = Object.values(TOOLS_DATA).map((t) => ({
    url: `${baseUrl}/tools/${t.slug}`,
    lastModified: new Date(t.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  return [
    ...staticRoutes,
    ...competitorRoutes,
    ...vsRoutes,
    ...featureRoutes,
    ...useCaseRoutes,
    ...integrationRoutes,
    ...howToRoutes,
    ...toolRoutes,
  ];
}
