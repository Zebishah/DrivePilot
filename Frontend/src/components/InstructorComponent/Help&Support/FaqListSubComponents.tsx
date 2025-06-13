import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import { MdOutlineQuestionAnswer } from "react-icons/md";

// 3. FAQ List Sub-components
export const FAQListHeader: React.FC = () => (
  <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
    <Typography variant="h6" sx={{ fontWeight: 600 }}>
      Frequently Asked Questions
    </Typography>
  </Box>
);

export const EmptyFAQState: React.FC = () => (
  <Paper sx={{ minHeight: 400 }}>
    <Box textAlign="center" py={8}>
      <MdOutlineQuestionAnswer
        style={{ fontSize: 64, color: "#ccc", marginBottom: 2 }}
      />
      <Typography variant="h6" color="text.secondary">
        No FAQs available at the moment.
      </Typography>
    </Box>
  </Paper>
);

export const FAQListSkeleton: React.FC = () => (
  <Paper sx={{ minHeight: 400 }}>
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="400px"
    >
      <CircularProgress size={48} sx={{ color: "#4DD0E1" }} />
    </Box>
  </Paper>
);

export const FAQListError: React.FC<{ error: any }> = ({ error }) => (
  <Paper sx={{ minHeight: 400, p: 2 }}>
    <Alert severity="error" sx={{ borderRadius: 2 }}>
      Error loading FAQs: {error.message}
    </Alert>
  </Paper>
);

interface FAQListActionsProps {
  hasMore: boolean;
  displayCount: number;
  itemsPerLoad: number;
  totalFaqs: number;
  onLoadMore: () => void;
  onShowLess: () => void;
}

export const FAQListActions: React.FC<FAQListActionsProps> = ({
  hasMore,
  displayCount,
  itemsPerLoad,
  totalFaqs,
  onLoadMore,
  onShowLess,
}) => (
  <>
    <Box
      display="flex"
      justifyContent="center"
      gap={2}
      sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}
    >
      {hasMore && (
        <Button
          variant="outlined"
          onClick={onLoadMore}
          sx={{
            borderColor: "#4db6ac",
            color: "#4db6ac",
            "&:hover": {
              borderColor: "#26a69a",
              backgroundColor: "rgba(77, 182, 172, 0.04)",
            },
            px: 4,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 500,
            textTransform: "none",
          }}
        >
          Load More
        </Button>
      )}

      {displayCount > itemsPerLoad && (
        <Button
          variant="outlined"
          onClick={onShowLess}
          sx={{
            borderColor: "#ff7043",
            color: "#ff7043",
            "&:hover": {
              borderColor: "#f4511e",
              backgroundColor: "rgba(255, 112, 67, 0.04)",
            },
            px: 4,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 500,
            textTransform: "none",
          }}
        >
          Show Less
        </Button>
      )}
    </Box>

    {!hasMore && totalFaqs > itemsPerLoad && (
      <Box display="flex" justifyContent="center" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          All FAQs loaded ({totalFaqs} total)
        </Typography>
      </Box>
    )}
  </>
);
