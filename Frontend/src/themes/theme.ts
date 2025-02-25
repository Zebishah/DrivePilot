import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#5FC2D3",
      dark: "#3AB7E0",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#333333",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF",
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
          borderRadius: 8,
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
            borderRadius: 6,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#5FC2D3",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#5FC2D3",
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
          borderRadius: 12,
          boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.08)",
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
            backgroundColor: "#E6F7FA",
            "&:hover": {
              backgroundColor: "#D4F2F6",
            },
          },
        },
      },
    },
  },
});

export default theme;
