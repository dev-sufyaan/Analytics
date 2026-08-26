import React from 'react';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  getMobileApplicationSchema,
  getHowToSchema,
  getFaqSchema,
  getBreadcrumbSchema,
} from '@/lib/seo/json-ld';
import { SITE_CONFIG } from '@/lib/seo/seo-config';
import { DownloadClient } from './DownloadClient';

export const metadata: Metadata = buildMetadata({
  title: 'Download Official Android App (Universal APK) · Analytics by Sufyaan Studio',
  description:
    'Download the official high-performance Android APK for Analytics by Sufyaan Studio. 60fps native charts, sub-50ms cold start, hardware keystore biometrics, and zero third-party store tracking.',
  path: '/download',
  keywords: [
    'download analytics android app',
    'analytics android apk',
    'privacy analytics mobile app',
    'native website analytics apk',
    'cookie-free android analytics',
    'download analytics apk',
    'real-time mobile analytics dashboard',
  ],
});

export default function DownloadPage() {
  const appSchema = getMobileApplicationSchema();

  const howToSchema = getHowToSchema({
    name: 'How to Install the Analytics Android App (Universal APK)',
    description:
      'A 3-step guide for downloading the official universal signed APK, verifying the SHA-256 binary integrity, and sideloading on Android 10 through 15.',
    steps: [
      {
        name: 'Download Official APK',
        text: `Visit ${SITE_CONFIG.baseUrl}/download on your Android device and download analytics-latest.apk.`,
        code: `sha256sum analytics-latest.apk\n# Expected: ${SITE_CONFIG.androidApp.sha256}`,
      },
      {
        name: 'Enable "Allow from this source"',
        text: 'When Android displays the unknown app security prompt, tap Settings and enable "Allow from this source" for your browser or file manager.',
      },
      {
        name: 'Install & Sign In',
        text: 'Tap Install. Launch the app and authenticate with your account credentials. Future updates will install seamlessly in-place.',
      },
    ],
  });

  const faqSchema = getFaqSchema([
    {
      question: 'Why is the app available only as an APK download on the official website?',
      answer:
        'We distribute the Android app directly as a universal signed APK to ensure 100% user privacy and independence. By bypassing Google Play, we eliminate mandatory Google Play Services telemetry, advertising ID tracking, store-level metadata collection, and forced review delays.',
    },
    {
      question: 'Is it safe to install this APK on my Android phone?',
      answer:
        'Yes, 100%. Our Android APK is cryptographically signed and built deterministically. You can independently verify the binary integrity by matching its SHA-256 hash against the checksum published on our official website.',
    },
    {
      question: 'How will I receive future updates if not from Google Play?',
      answer:
        'The app contains a built-in release checker that connects directly to our releases bucket. When a new version is released, the app notifies you in Settings and lets you download and install the update in-place with a single tap.',
    },
    {
      question: 'Which Android devices and versions are supported?',
      answer:
        'The APK is a universal build that supports Android 10 through Android 15 (API levels 29 to 35) across ARM64 (arm64-v8a), ARM32 (armeabi-v7a), and x86_64 processor architectures.',
    },
  ]);

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Download Android App', url: '/download' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <DownloadClient />
    </>
  );
}
