import { createTheme } from "@mui/material/styles";
import { designTokens } from "./tokens";

const theme = createTheme({
  palette: {
    primary: {
      main: designTokens.color.primary,
      dark: designTokens.color.primaryHover,
      light: designTokens.color.primarySoft,
      contrastText: "#FFFFFF",
    },
    secondary: { main: designTokens.color.navy, contrastText: "#FFFFFF" },
    background: { default: designTokens.color.canvas, paper: designTokens.color.surface },
    text: { primary: designTokens.color.ink, secondary: designTokens.color.muted },
  },
  typography: {
    fontFamily: [
      "Poppins",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "::selection": { color: "#FFFFFF", backgroundColor: designTokens.color.primary },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 42,
          borderRadius: designTokens.radius.sm,
          boxShadow: "none",
          transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
          "&:hover": { boxShadow: "none", transform: "translateY(-1px)" },
          "&:focus-visible": {
            outline: `3px solid ${designTokens.color.primarySoft}`,
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${designTokens.color.primary}, ${designTokens.color.primaryHover})`,
          "&:hover": { background: designTokens.color.primaryHover },
        },
        outlinedPrimary: {
          borderColor: designTokens.color.primary,
          color: designTokens.color.primaryHover,
          "&:hover": { borderColor: designTokens.color.primaryHover, backgroundColor: designTokens.color.primarySoft },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: designTokens.color.ink,
          "&:hover": { backgroundColor: designTokens.color.primarySoft, color: designTokens.color.primaryHover },
          "&:focus-visible": { outline: `3px solid ${designTokens.color.primarySoft}`, outlineOffset: 2 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 600, color: designTokens.color.muted } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: designTokens.radius.sm,
            backgroundColor: designTokens.color.surface,
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: designTokens.color.primary },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: designTokens.color.primary,
              borderWidth: "2px",
            },
          },
          "& .MuiOutlinedInput-input": { height: "100%", padding: "12px" },
          "& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)": { height: "54px" },
          "& .MuiInputBase-input:-webkit-autofill": {
            boxShadow: `0 0 0 1000px ${designTokens.color.surface} inset`,
            WebkitTextFillColor: designTokens.color.ink,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${designTokens.color.border}`,
          borderRadius: designTokens.radius.md,
          boxShadow: designTokens.shadow.sm,
          transition: "transform 160ms ease, box-shadow 160ms ease",
          "&:hover": { boxShadow: designTokens.shadow.md },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          marginTop: 8,
          border: `1px solid ${designTokens.color.border}`,
          borderRadius: designTokens.radius.sm,
          boxShadow: designTokens.shadow.md,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 42,
          borderRadius: 8,
          margin: "2px 6px",
          "&.Mui-selected": {
            backgroundColor: designTokens.color.primarySoft,
            "&:hover": { backgroundColor: "#FFE3DA" },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 99, backgroundColor: designTokens.color.primary },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 46,
          color: designTokens.color.muted,
          "&.Mui-selected": { color: designTokens.color.primaryHover, fontWeight: 700 },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { border: `1px solid ${designTokens.color.border}`, borderRadius: designTokens.radius.md, boxShadow: designTokens.shadow.md },
      },
    },
  },
});

export default theme;
