import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_ALL_FAQS } from "../graphql/Queries/Faqs";

export const useFAQs = (itemsPerLoad = 5) => {
  const [displayCount, setDisplayCount] = useState(itemsPerLoad);
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  const { loading, error, data } = useQuery(GET_ALL_FAQS, {
    errorPolicy: "all",
  });

  const faqs = data?.getAllFaqs || [];
  const displayedFaqs = faqs.slice(0, displayCount);
  const hasMore = displayCount < faqs.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + itemsPerLoad, faqs.length));
  };

  const handleUnloadFaqs = () => {
    setDisplayCount(itemsPerLoad);
    setExpandedPanel(false);
  };

  const handleAccordionChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanel(isExpanded ? panel : false);
    };

  // Auto-scroll effect
  useEffect(() => {
    if (displayCount > itemsPerLoad) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [displayCount, itemsPerLoad]);

  return {
    faqs: displayedFaqs,
    allFaqs: faqs,
    loading,
    error,
    expandedPanel,
    hasMore,
    displayCount,
    itemsPerLoad,
    handleLoadMore,
    handleUnloadFaqs,
    handleAccordionChange,
  };
};
