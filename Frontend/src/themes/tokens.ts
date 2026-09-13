export const designTokens = {
  color: {
    ink: "#102a43",
    muted: "#627d98",
    canvas: "#f7fafc",
    surface: "#ffffff",
    surfaceMuted: "#eef4f7",
    border: "#d9e2ec",
    primary: "#167d91",
    primaryHover: "#0f6475",
    primarySoft: "#e4f4f6",
    success: "#16794c",
    warning: "#9a6700",
    error: "#b42318",
    info: "#175cd3",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  shadow: {
    sm: "0 1px 3px rgba(16, 42, 67, 0.08)",
    md: "0 8px 24px rgba(16, 42, 67, 0.10)",
  },
  breakpoint: {
    mobile: 600,
    tablet: 900,
    desktop: 1200,
  },
} as const;
