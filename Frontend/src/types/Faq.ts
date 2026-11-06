export interface Faq {
  _id: string;
  question: string;
  answer: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFaqInput {
  question: string;
  answer: string;
  adminId: string;
}

export interface UpdateFaqInput {
  id: string;
  question?: string;
  answer?: string;
}
export interface FAQ {
  _id: string;
  question: string;
  answer: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetFaqsByAdminResponse {
  getFaqsByAdmin: FAQ[];
}
export interface GetAllFaqsResponse {
  getAllFaqs: FAQ[];
}
export interface GetFaqsByAdminVariables {
  adminId: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  description: string;
}

export interface FAQAccordionProps {
  faq: FAQ;
  expanded: boolean;
  onChange: (
    panel: string
  ) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
}

export interface FAQPageProps {
  adminId: string;
}
