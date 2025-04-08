"use client";

import type React from "react";
import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Card,
  Divider,
  Avatar,
  Container,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  DeleteOutline,
} from "@mui/icons-material";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { Copy, Link } from "lucide-react";
import {
  CREATE_SIGNUP_LINK,
  DELETE_SIGNUP_LINK,
  GET_ALL_SIGNUP_LINKS,
} from "../../../graphql/mutations/auth";
import { useMutation, useQuery } from "@apollo/client";
import toast from "react-hot-toast";

const AdminAccess = () => {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const { data, loading, error, refetch } = useQuery(GET_ALL_SIGNUP_LINKS);

  const [deleteSignupLink] = useMutation(DELETE_SIGNUP_LINK, {
    onCompleted: () => refetch(),
  });
  const [createSignupLink, { loading: creating }] = useMutation(
    CREATE_SIGNUP_LINK,
    {
      onCompleted: () => {
        refetch(); // Refresh the list after adding a new link
        setShowForm(false);
        setFirstName("");
        setLastName("");
        setEmail("");
        setAgreed(false);
      },
    }
  );

  const handleToggleForm = () => {
    setShowForm(!showForm);
  };

  const handleCopy = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Copied to clipboard");
  };

  const handleDelete = async (id) => {
    try {
      await deleteSignupLink({ variables: { id } });
      toast.success("Signup Link Successfully Deleted");
    } catch (error) {
      console.log("Error", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !agreed) {
      toast.error("Please fill in all fields and agree to the terms.");
      return;
    }
    await createSignupLink({
      variables: { firstName, lastName, email },
    });
  };
  return (
    <div>
      <Container
        maxWidth={false}
        sx={{
          mt: 4,
          fontFamily: "poppins",
        }}
      >
        <Card
          sx={{
            mb: 4,
            border: "1px solid #e0e0e0",
            borderRadius: 2,
            overflow: "visible",
            maxWidth: "1102px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              p: 2,
              alignItems: "center",

              borderBottom: "1px solid #e0e0e0",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontFamily: "poppins",
                fontSize: "20px",
              }}
            >
              Add Admin
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: "6px",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 500,
                  fontFamily: "poppins",
                  fontSize: "18px",
                }}
              >
                Add
              </Typography>

              <Button
                onClick={handleToggleForm}
                sx={{
                  borderRadius: "10px",
                  backgroundColor: "#5EC2D2",
                  color: "#000",
                  paddingY: 1,
                  paddingX: 1,
                  width: 40, // Set the width to 40
                  minWidth: 40, // Ensure the button doesn't shrink below 40
                  height: 40,
                }}
              >
                <AiOutlinePlusCircle size={20} />
              </Button>
            </Box>
          </Box>

          {showForm && (
            <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    fontFamily: "poppins",
                    fontSize: "18px",
                    mb: 1,
                  }}
                >
                  First Name
                </Typography>
                <TextField
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  sx={{
                    width: "65%",
                    maxHeight: "44px",

                    "& .MuiOutlinedInput-root": {
                      borderRadius: "4px", // Adjust this value
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderRadius: "4px", // Ensure the border radius is applied to the outline
                    },
                    "& .MuiOutlinedInput-input::placeholder": {
                      fontFamily: "poppins",
                      fontSize: "16px",
                    },
                  }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    fontFamily: "poppins",
                    fontSize: "18px",
                    mb: 1,
                  }}
                >
                  Last Name
                </Typography>
                <TextField
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  sx={{
                    width: "65%",
                    maxHeight: "44px",

                    "& .MuiOutlinedInput-root": {
                      borderRadius: "4px", // Adjust this value
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderRadius: "4px", // Ensure the border radius is applied to the outline
                    },
                    "& .MuiOutlinedInput-input::placeholder": {
                      fontFamily: "poppins",
                      fontSize: "16px",
                    },
                  }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    fontFamily: "poppins",
                    fontSize: "18px",
                    mb: 1,
                  }}
                >
                  Email
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outlined"
                  type="email"
                  sx={{
                    width: "65%",
                    maxHeight: "44px",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "4px", // Adjust this value
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderRadius: "4px", // Ensure the border radius is applied to the outline
                    },
                    "& .MuiOutlinedInput-input::placeholder": {
                      fontFamily: "poppins",

                      fontSize: "16px",
                    },
                  }}
                />
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    name="agreed"
                    color="primary"
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 400,
                      fontFamily: "poppins",
                      fontSize: "16px",
                    }}
                  >
                    I have read and agreed with Terms of Use and Privacy Policy
                  </Typography>
                }
                sx={{ mb: 2 }}
              />

              <Button
                type="submit"
                variant="contained"
                sx={{
                  bgcolor: "#5EC2D2",
                  "&:hover": { bgcolor: "#5EC2D2" },
                  py: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  fontFamily: "poppins",
                  fontSize: "18px",
                  maxHeight: "50px",
                  width: "65%",
                }}
              >
                Add
              </Button>
            </Box>
          )}
        </Card>

        <Card
          sx={{
            mb: 4,
            border: "1px solid #e0e0e0",
            borderRadius: 2,
            overflow: "visible",
            maxWidth: "1102px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              p: 2,
              alignItems: "center",

              borderBottom: "1px solid #e0e0e0",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontFamily: "poppins",
                fontSize: "20px",
              }}
            >
              Links created
            </Typography>
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              width: "100%",
              maxHeight: "489px",
              overflowY: "auto",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontFamily: "poppins",
                      fontWeight: "500",
                      fontSize: "18px",
                      borderBottom: "none", // Remove bottom border
                    }}
                  >
                    Name
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: "poppins",
                      fontWeight: "500",
                      fontSize: "18px",
                      borderBottom: "none", // Remove bottom border
                    }}
                  >
                    Email Address
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: "poppins",
                      fontWeight: "500",
                      fontSize: "18px",
                      borderBottom: "none", // Remove bottom border
                    }}
                  >
                    Signup Date
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: "poppins",
                      fontWeight: "500",
                      fontSize: "18px",
                      borderBottom: "none", // Remove bottom border
                    }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontFamily: "poppins",
                      fontWeight: "500",
                      fontSize: "18px",
                      marginRight: "20px",
                      borderBottom: "none", // Remove bottom border
                    }}
                  ></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.getAllSignupLinks?.map((admin) => (
                  <TableRow
                    key={admin.id}
                    sx={{
                      fontFamily: "poppins",
                      fontWeight: "700px",
                      fontSize: "15px",
                      borderBottom: "none", // Remove bottom border for the row
                    }}
                  >
                    <TableCell
                      sx={{
                        fontFamily: "poppins",
                        fontWeight: "400",
                        fontSize: "15px",
                        borderBottom: "none",
                        marginBottom: "60px", // Remove bottoms border
                      }}
                    >
                      {admin.firstName || "N/a"}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: "poppins",
                        fontWeight: "400",
                        fontSize: "15px",
                        borderBottom: "none", // Remove bottom border
                      }}
                    >
                      {admin?.email || "N/a"}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: "poppins",
                        fontWeight: "400",
                        fontSize: "15px",
                        borderBottom: "none", // Remove bottom border
                      }}
                    >
                      {admin?.signupDate
                        ? new Date(
                          parseInt(admin.signupDate)
                        ).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                        : "N/A"}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: "poppins",
                        fontWeight: "400",
                        fontSize: "15px",
                        borderBottom: "none", // Remove bottom border
                      }}
                    >
                      {admin.pending ? "Pending" : "Active"}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontFamily: "poppins",
                        fontWeight: "400",
                        fontSize: "15px",
                        borderBottom: "none", // Remove bottom border
                      }}
                    >
                      <IconButton
                        size="small"
                        sx={{ color: "#5BC2E7" }}
                        onClick={() => window.open(admin.signupLink, "_blank")}
                      >
                        <Link size={15} />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ color: "#5BC2E7" }}
                        onClick={() => handleCopy(admin.signupLink)}
                      >
                        <Copy size={15} />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ color: "#00" }}
                        onClick={() => handleDelete(admin.id)}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Container>
    </div>
  );
};

export default AdminAccess;
