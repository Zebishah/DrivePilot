/** Approved ocean-blue / golden-yellow palette, shared across every Drive Pilot route. */
export const intelligentTokens = {
  canvas: "#F1F6F4",
  sidebar: "#172B36",
  ocean: "#114C5A",
  surface: "#FFFFFF",
  elevated: "#F6F9F8",
  hover: "#E8F0EF",
  border: "#D2DFE1",
  ink: "#172B36",
  muted: "#4F6874",
  subtle: "#566F7A",
  primary: "#FFC801",
  primaryHover: "#EAB700",
  primarySoft: "#FFF5C7",
  primaryInk: "#114C5A",
  onPrimary: "#172B36",
  success: "#23765B",
  warning: "#805800",
  error: "#B63838",
  info: "#17667B",
  chart: ["#114C5A", "#FFC801", "#427E90", "#FF9932", "#A8C5CD"],
} as const;

export function usesIntelligentTheme(pathname: string) {
  return pathname.startsWith("/");
}
