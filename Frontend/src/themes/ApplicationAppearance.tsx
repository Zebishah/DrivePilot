import { useLayoutEffect } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import intelligentTheme from "./intelligentTheme";
import theme from "./theme";
import { usesIntelligentTheme } from "./intelligentTokens";

/** Body scoping includes menus, date pickers, drawers, and dialogs rendered in portals. */
export default function ApplicationAppearance() {
  const { pathname } = useLocation();
  const isWorkspace = usesIntelligentTheme(pathname);

  useLayoutEffect(() => {
    document.body.classList.toggle("dsp-intelligent", isWorkspace);
    return () => document.body.classList.remove("dsp-intelligent");
  }, [isWorkspace]);

  return (
    <ThemeProvider theme={isWorkspace ? intelligentTheme : theme}>
      {isWorkspace && <CssBaseline />}
      <Outlet />
    </ThemeProvider>
  );
}
