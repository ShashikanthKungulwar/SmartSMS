import { MD3LightTheme,MD3DarkTheme} from 'react-native-paper';

export const BRAND_PRIMARY = '#1D9E75';

export const CATEGORY_COLORS: Record<string, string> = {
  OTP: '#1D9E75',
  Bank: '#185FA5',
  Promo: '#D85A30',
  Delivery: '#7F77DD',
  Spam: '#B33131',
  Personal: '#666666',
  unknown: '#9CA3AF',
};

export const CATEGORY_ICONS: Record<string, string> = {
  OTP: 'shield-key-outline',
  Bank: 'bank-outline',
  Promo: 'tag-outline',
  Delivery: 'package-variant-closed',
  Spam: 'alert-octagon-outline',
  Personal: 'account-outline',
  unknown: 'help-circle-outline',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const theme1 = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,

    // Brand
    primary: "#1D9E75",
    onPrimary: "#FFFFFF",

    primaryContainer: "#B7EDD8",
    onPrimaryContainer: "#00251A",

    secondary: "#185FA5",
    onSecondary: "#FFFFFF",

    secondaryContainer: "#D6E9FF",
    onSecondaryContainer: "#002C4D",

    // Background
    background: "#F8FAF9",
    surface: "#FFFFFF",
    surfaceVariant: "#F1F4F3",

    // Text
    onBackground: "#1A1A1A",
    onSurface: "#1A1A1A",
    onSurfaceVariant: "#5C6662",

    // Borders
    outline: "#C9D3CF",

    // Error
    error: "#C62828",
    onError: "#FFFFFF",

    // Misc
    elevation: {
      level0: "#F8FAF9",
      level1: "#FFFFFF",
      level2: "#F6F8F7",
      level3: "#F1F4F3",
      level4: "#ECEFED",
      level5: "#E7EBE9",
    },
  },
};


export const theme2 = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,

    // Brand
    primary: "#4FD1A5",
    onPrimary: "#002116",

    primaryContainer: "#0D4B37",
    onPrimaryContainer: "#B7EDD8",

    secondary: "#82BFFF",
    onSecondary: "#002C4D",

    secondaryContainer: "#184A73",
    onSecondaryContainer: "#D6E9FF",

    // Background
    background: "#121212",
    surface: "#1C1C1E",
    surfaceVariant: "#2A2A2D",

    // Text
    onBackground: "#F2F2F2",
    onSurface: "#F2F2F2",
    onSurfaceVariant: "#C7C7C7",

    // Borders
    outline: "#4A4A4A",

    // Error
    error: "#FF6B6B",
    onError: "#3A0000",

    // Misc
    elevation: {
      level0: "#121212",
      level1: "#1C1C1E",
      level2: "#232326",
      level3: "#2A2A2D",
      level4: "#313135",
      level5: "#38383C",
    },
  },
};
// export type AppTheme = typeof theme;
// export type AppTheme2 = typeof theme2;
