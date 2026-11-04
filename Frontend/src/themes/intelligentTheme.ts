import { createTheme } from "@mui/material/styles";
import { intelligentTokens as c } from "./intelligentTokens";

const intelligentTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: c.primary,
      dark: "#9bd485",
      light: c.primaryHover,
      contrastText: c.onPrimary,
    },
    secondary: { main: c.info, contrastText: c.onPrimary },
    background: { default: c.canvas, paper: c.surface },
    text: { primary: c.ink, secondary: c.muted, disabled: c.subtle },
    divider: c.border,
    success: { main: c.success, contrastText: c.onPrimary },
    warning: { main: c.warning, contrastText: "#302715" },
    error: { main: c.error, contrastText: "#351d1a" },
    info: { main: c.info, contrastText: c.onPrimary },
    grey: {
      50: "#1b3025",
      100: "#172a21",
      200: "#294034",
      300: "#42604b",
      400: c.subtle,
      500: c.muted,
      600: "#b9c8b5",
      700: "#d1ddc9",
      800: c.ink,
      900: "#f7fbf2",
    },
    action: {
      hover: "rgba(184,245,161,.06)",
      selected: c.primarySoft,
      disabled: "#81967e",
      disabledBackground: "#203126",
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 500, letterSpacing: "-.055em" },
    h2: { fontWeight: 500, letterSpacing: "-.045em" },
    h3: { fontWeight: 500, letterSpacing: "-.035em" },
    h4: { fontWeight: 500, letterSpacing: "-.035em" },
    h5: { fontWeight: 500, letterSpacing: "-.025em" },
    h6: { fontWeight: 500, letterSpacing: "-.02em" },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: c.canvas, color: c.ink },
        "::selection": { background: c.primary, color: c.onPrimary },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", color: c.ink },
        outlined: { borderColor: c.border },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          boxShadow: "0 12px 32px #00000012",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 6,
          minHeight: 42,
          paddingInline: 18,
          fontSize: ".8rem",
          "&:focus-visible": {
            outline: `2px solid ${c.primary}`,
            outlineOffset: 3,
          },
        },
        containedPrimary: {
          background: c.primary,
          color: c.onPrimary,
          "&:hover": { background: c.primaryHover },
        },
        outlined: {
          borderColor: c.border,
          "&:hover": { borderColor: c.primary, background: c.primarySoft },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: c.muted,
          "&:hover": { color: c.primary, background: c.primarySoft },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: "#0c1a14",
          borderRadius: 7,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#55704e",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: c.primary,
          },
          "&.Mui-focused": { boxShadow: "0 0 0 3px #b8f5a112" },
        },
        notchedOutline: { borderColor: c.border },
        input: {
          fontSize: ".85rem",
          "&::placeholder": { color: c.subtle, opacity: 1 },
          "&:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 1000px #0c1a14 inset",
            WebkitTextFillColor: c.ink,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: c.muted, fontSize: ".8rem" } },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: ".72rem", color: c.muted } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: c.border, fontSize: ".8rem" },
        head: { color: c.muted, background: "#14251b", fontWeight: 500 },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&.MuiTableRow-hover:hover": { background: "#b8f5a106" } },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { background: c.primary, height: 2 } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: ".8rem",
          textTransform: "none",
          color: c.muted,
          "&.Mui-selected": { color: c.primary },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: c.elevated,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          marginTop: 6,
          boxShadow: "0 18px 50px #0005",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: ".82rem",
          "&.Mui-selected": { background: c.primarySoft },
          "&:hover, &.Mui-selected:hover": { background: c.hover },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 16,
          boxShadow: "0 30px 100px #0008",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 500, letterSpacing: "-.03em" } },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: "16px 24px", borderTop: `1px solid ${c.border}` },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { background: c.sidebar, color: c.ink, borderColor: c.border },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: "#294034",
          color: c.ink,
          border: "1px solid #42604b",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          "&.MuiChip-colorDefault": { background: c.elevated },
        },
        outlined: { borderColor: c.border },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
        standardError: { background: "#321e1b", color: c.error },
        standardSuccess: { background: "#183222", color: c.success },
        standardWarning: { background: "#302a1b", color: c.warning },
        standardInfo: { background: "#17302c", color: c.info },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        colorDefault: { background: c.primarySoft, color: c.primary },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { background: "#263f2c", borderRadius: 8 },
        bar: { background: c.primary },
      },
    },
    MuiSkeleton: { styleOverrides: { root: { background: "#20382a" } } },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          color: c.muted,
          "&.Mui-selected": {
            background: c.primary,
            color: c.onPrimary,
            "&:hover": { background: c.primaryHover },
          },
        },
      },
    },
  },
});

export default intelligentTheme;
