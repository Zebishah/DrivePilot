/** The same midnight / mint palette used by the public landing experience. */
export const intelligentTokens = {
  canvas: "#071211",
  sidebar: "#0a1713",
  surface: "#102019",
  elevated: "#172a21",
  hover: "#1b3025",
  border: "#294034",
  ink: "#eff4eb",
  muted: "#a2b5a4",
  subtle: "#8fa58f",
  primary: "#b8f5a1",
  primaryHover: "#cbffb9",
  primarySoft: "#223a27",
  onPrimary: "#14251a",
  success: "#a3e6b0",
  warning: "#edca82",
  error: "#ffaaa5",
  info: "#9bd7cf",
  chart: ["#b8f5a1", "#7cc8b3", "#d8d28c", "#8daea0", "#d2b895"],
} as const;

export function usesIntelligentTheme(pathname: string) {
  return /^\/(auth(?:\/|$)|signup\/|payment(?:\/|$)|onboarding(?:\/|$)|(?:student|teacher|admin)-dashboard(?:\/|$))/.test(
    pathname,
  );
}
