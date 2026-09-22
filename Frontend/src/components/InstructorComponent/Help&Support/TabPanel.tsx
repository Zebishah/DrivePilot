import React from "react";
import { Box } from "@mui/material";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  className,
  ...other
}) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`simple-tabpanel-${index}`}
    aria-labelledby={`simple-tab-${index}`}
    className={className}
    {...other}
  >
    {value === index && <Box>{children}</Box>}
  </div>
);
