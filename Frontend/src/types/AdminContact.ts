export interface ContactDetail {
  _id: string;
  supportEmail: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDetailInput {
  supportEmail: string;
}

export interface UpdateContactDetailInput {
  id: string;
  supportEmail?: string;
}
export interface ContactInput {
  name: string;
  email: string;
  description: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

export interface SendContactEmailMutation {
  sendContactEmail: ContactResponse;
}

export interface SendContactEmailVariables {
  input: ContactInput;
}
