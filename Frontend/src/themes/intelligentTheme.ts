import { createTheme } from "@mui/material/styles";
import { intelligentTokens as c } from "./intelligentTokens";

const intelligentTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: c.primary,
      dark: c.primaryHover,
      light: c.primarySoft,
      contrastText: c.onPrimary,
    },
    secondary: { main: c.ocean, contrastText: "#FFFFFF" },
    background: { default: c.canvas, paper: c.surface },
    text: { primary: c.ink, secondary: c.muted, disabled: c.subtle },
    divider: c.border,
    success: { main: c.success },
    warning: { main: c.warning },
    error: { main: c.error },
    info: { main: c.info },
    action: {
      hover: "#114C5A08",
      selected: c.primarySoft,
      disabled: "#73858E",
      disabledBackground: "#E2EAE8",
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
          boxShadow: "0 10px 28px #172B3608",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 7,
          minHeight: 42,
          paddingInline: 18,
          fontSize: ".8rem",
          "&:focus-visible": {
            outline: `2px solid ${c.ocean}`,
            outlineOffset: 3,
          },
        },
        containedPrimary: {
          background: c.primary,
          color: c.onPrimary,
          "&:hover": { background: c.primaryHover },
        },
        outlined: {
          color: c.ocean,
          borderColor: c.border,
          "&:hover": { borderColor: c.ocean, background: c.hover },
        },
        textPrimary: { color: c.ocean, "&:hover": { background: c.hover } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: c.muted,
          "&:hover": { color: c.ocean, background: c.hover },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: c.surface,
          borderRadius: 8,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#78959F",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: c.ocean,
          },
          "&.Mui-focused": { boxShadow: "0 0 0 3px #114C5A0D" },
        },
        notchedOutline: { borderColor: c.border },
        input: {
          fontSize: ".85rem",
          "&::placeholder": { color: c.subtle, opacity: 1 },
          "&:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 1000px #FFFFFF inset",
            WebkitTextFillColor: c.ink,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: c.muted,
          fontSize: ".8rem",
          "&.Mui-focused": { color: c.ocean },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: ".72rem", color: c.muted } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: c.border, fontSize: ".8rem" },
        head: { color: c.muted, background: c.elevated, fontWeight: 600 },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&.MuiTableRow-hover:hover": { background: c.hover } },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { background: c.ocean, height: 2 } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: ".8rem",
          textTransform: "none",
          color: c.muted,
          "&.Mui-selected": { color: c.ocean },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          marginTop: 6,
          boxShadow: "0 18px 50px #172B3620",
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
          boxShadow: "0 30px 100px #172B3630",
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
        paper: { background: c.surface, color: c.ink, borderColor: c.border },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: c.sidebar,
          color: "#FFFFFF",
          border: "1px solid #365564",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          "&.MuiChip-colorDefault": { background: c.hover, color: c.ocean },
        },
        outlined: { borderColor: c.border },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
        standardError: { background: "#FFF0EF", color: c.error },
        standardSuccess: { background: "#E9F5EF", color: c.success },
        standardWarning: { background: "#FFF5D3", color: c.warning },
        standardInfo: { background: "#E8F3F6", color: c.info },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        colorDefault: { background: "#D9E8E2", color: c.ocean },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { background: "#E1EAE8", borderRadius: 8 },
        bar: { background: c.ocean },
      },
    },
    MuiSkeleton: { styleOverrides: { root: { background: "#E1EAE8" } } },
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
    MuiCheckbox: {
      styleOverrides: {
        root: { color: "#78939E", "&.Mui-checked": { color: c.ocean } },
      },
    },
    MuiRadio: {
      styleOverrides: { root: { "&.Mui-checked": { color: c.ocean } } },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: c.ocean,
            "& + .MuiSwitch-track": { backgroundColor: c.ocean },
          },
        },
      },
    },
    MuiSlider: { styleOverrides: { root: { color: c.ocean } } },
    MuiLink: { styleOverrides: { root: { color: c.ocean } } },
  },
});
export default intelligentTheme;
