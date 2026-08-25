// apps/mobile/src/theme/tokens.ts
// Single source of truth for mobile design tokens matching packages/ui/tokens.css & Studio White aesthetic

import { TextStyle, ViewStyle } from 'react-native';

export const tokens = {
  colors: {
    // Canvas & Surface System (Studio White Theme)
    canvas: '#ffffff',
    canvasSubtle: '#f8fafc',
    canvasDark: '#010120',
    canvasDarkDeep: '#000014',

    // Card Surfaces
    surfaceCard: '#ffffff',
    surfaceSubtle: '#f1f5f9',
    surfaceMuted: '#f8fafc',
    surfaceDarkCard: '#090924',
    surfaceDarkElevated: '#111136',
    surfaceDarkSoft: '#26263a',
    surfaceDarkFill: '#313641',

    // Borders & Dividers
    hairline: '#ebebeb',
    hairlineSubtle: '#f1f5f9',
    hairlineDark: '#26263a',
    borderSubtle: '#e2e8f0',

    // Text & Ink
    ink: '#000000',
    inkLight: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    body: '#71717a',
    bodyMuted: '#999999',
    bodyDark: '#a1a1aa',

    // Brand Neon & Accent System
    brandOrange: '#fc4c02',
    brandMagenta: '#ef2cc1',
    brandPeriwinkle: '#bdbbff',
    brandMint: '#c8f6f9',

    // Tinted Card Surfaces (matching web design)
    accentMint: '#c8f6f9',
    accentMintLight: 'rgba(200, 246, 249, 0.45)',
    accentMintDark: '#0891b2',
    accentMintText: '#083344',

    accentPeriwinkle: '#bdbbff',
    accentPeriwinkleLight: 'rgba(189, 187, 255, 0.45)',
    accentPeriwinkleDark: '#4f46e5',
    accentPeriwinkleText: '#1e1b4b',

    accentOrange: '#fc4c02',
    accentOrangeLight: 'rgba(252, 76, 2, 0.12)',
    accentOrangeDark: '#c2410c',

    accentMagenta: '#ef2cc1',
    accentMagentaLight: 'rgba(239, 44, 193, 0.12)',

    // Semantic Trend Colors
    trendPositive: '#059669',
    trendPositiveBg: '#ecfdf5',
    trendPositiveBorder: '#a7f3d0',
    trendNegative: '#dc2626',
    trendNegativeBg: '#fef2f2',
    trendNegativeBorder: '#fecaca',
    warning: '#d97706',
    warningBg: '#fffbeb',
  },

  radii: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
  },

  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    } as ViewStyle,
    cardElevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    } as ViewStyle,
    glowMint: {
      shadowColor: '#0891b2',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    } as ViewStyle,
  },

  typography: {
    monoEyebrow: {
      fontFamily: 'System',
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: '#71717a',
    } as TextStyle,
    displayHero: {
      fontFamily: 'System',
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: '#000000',
    } as TextStyle,
    displayTitle: {
      fontFamily: 'System',
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: '#000000',
    } as TextStyle,
    displaySubhead: {
      fontFamily: 'System',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: -0.2,
      color: '#000000',
    } as TextStyle,
    bodyRegular: {
      fontFamily: 'System',
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: '#475569',
    } as TextStyle,
    bodySmall: {
      fontFamily: 'System',
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      color: '#71717a',
    } as TextStyle,
  },
};
