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
    secondary: {
      main: designTokens.color.navy,
      contrastText: "#FFFFFF",
    },
    background: {
      default: designTokens.color.canvas,
      paper: designTokens.color.surface,
    },
    text: {
      primary: designTokens.color.ink,
      secondary: designTokens.color.muted,
    },
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
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
      root: {
        borderRadius: designTokens.radius.sm,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          color: "#000000",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            // height: "54px",
          borderRadius: designTokens.radius.sm,
            "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: designTokens.color.primary,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: designTokens.color.primary,
              borderWidth: "2px",
            },
          },
          "& .MuiOutlinedInput-input": {
            height: "100%",
            padding: "12px",
          },
          "& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)": {
            // Apply height only for single-line
            height: "54px",
          },
          "& .MuiInputBase-input:-webkit-autofill": {
            boxShadow: "0 0 0px 1000px #FFFFFF inset",
            height: "41.2px",
          },
        },
      },
    },

    // MuiTextField: {
    //   styleOverrides: {
    //     root: {
    //       "& .MuiOutlinedInput-root": {
    //         borderRadius: 6,
    //         "&:hover .MuiOutlinedInput-notchedOutline": {
    //           borderColor: "#5FC2D3",
    //         },
    //         "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    //           borderColor: "#5FC2D3",
    //           borderWidth: "2px",
    //         },
    //       },
    //       "& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)": {
    //         // Apply height only for single-line
    //         height: "54px",
    //       },
    //       "& .MuiOutlinedInput-input": {
    //         padding: "12px",
    //       },
    //     },
    //   },
    // },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.md,
          boxShadow: designTokens.shadow.sm,
        },
      },
    },
    // MuiSelect: {
    //   styleOverrides: {
    //     root: {
    //       borderRadius: 8,
    //       height: "44px",
    //       "& .MuiOutlinedInput-notchedOutline": {
    //         borderColor: "#CCCCCC",
    //       },
    //       "&:hover .MuiOutlinedInput-notchedOutline": {
    //         borderColor: "#5FC2D3",
    //       },
    //       "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    //         borderColor: "#5FC2D3",
    //         borderWidth: "2px",
    //       },
    //     },
    //   },
    // },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: designTokens.color.primarySoft,
            "&:hover": {
              backgroundColor: "#f8d7cd",
            },
          },
        },
      },
    },
  },
});

export default theme;
