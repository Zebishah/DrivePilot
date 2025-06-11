import React from "react";
import { Box, Paper } from "@mui/material";
import { FAQ } from "../../types/Faq";
import {
  EmptyFAQState,
  FAQListActions,
  FAQListError,
  FAQListHeader,
  FAQListSkeleton,
} from "./FaqListSubComponents";
import FAQAccordion from "./FaqAccordion";

interface FAQListProps {
  faqs: FAQ[];
  allFaqs: FAQ[];
  loading: boolean;
  error?: string;
  expandedPanel: string | false;
  hasMore: boolean;
  displayCount: number;
  itemsPerLoad: number;
  onLoadMore: () => void;
  onShowLess: () => void;
  onAccordionChange: (
    panel: string
  ) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const FAQList: React.FC<FAQListProps> = ({
  faqs,
  allFaqs,
  loading,
  error,
  expandedPanel,
  hasMore,
  displayCount,
  itemsPerLoad,
  onLoadMore,
  onShowLess,
  onAccordionChange,
}) => {
  if (loading) {
    return <FAQListSkeleton />;
  }

  if (error) {
    return <FAQListError error={error} />;
  }

  if (allFaqs.length === 0) {
    return <EmptyFAQState />;
  }

  return (
    <Paper sx={{ minHeight: 400 }}>
      <FAQListHeader />

      <Box sx={{ p: 2 }}>
        {faqs.map((faq) => (
          <FAQAccordion
            key={faq._id}
            faq={faq}
            expanded={expandedPanel === faq._id}
            onChange={onAccordionChange}
          />
        ))}
      </Box>

      <FAQListActions
        hasMore={hasMore}
        displayCount={displayCount}
        itemsPerLoad={itemsPerLoad}
        totalFaqs={allFaqs.length}
        onLoadMore={onLoadMore}
        onShowLess={onShowLess}
      />
    </Paper>
  );
};
