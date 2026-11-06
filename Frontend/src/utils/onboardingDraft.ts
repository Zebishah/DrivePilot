export type OnboardingRole = "Student" | "Instructor";

export interface OnboardingDocumentDraft {
  documentType: string;
  fileName?: string;
}

export interface OnboardingDraft {
  version: 1;
  savedAt: number;
  activeStep: number;
  formValues: Record<string, unknown>;
  coordinates?: {
    type: "Point";
    coordinates: [number, number];
  };
  documents: OnboardingDocumentDraft[];
}

export const ONBOARDING_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;
const DRAFT_PREFIX = "dsp:onboarding-draft:";

const SAFE_FIELDS: Record<OnboardingRole, readonly string[]> = {
  Student: [
    "homeAddress",
    "location",
    "zipCode",
    "phone",
    "description",
    "fatherName",
    "dateOfBirth",
    "languagePreference",
    "documents",
  ],
  Instructor: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "location",
    "zipCode",
    "description",
    "experience",
    "languagePreference",
    "carName",
    "transmissionType",
    "gender",
    "documents",
    "optionalDocuments",
  ],
};

function draftKey(userId: string, role: OnboardingRole) {
  return `${DRAFT_PREFIX}${userId}:${role}`;
}

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeSerializable(value: unknown): unknown {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(safeSerializable).filter((item) => item !== undefined);
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (["password", "token", "jwt", "otp", "secret", "apiKey", "stripeSecret"].some((blocked) => key.toLowerCase().includes(blocked.toLowerCase()))) {
        continue;
      }
      const safeValue = safeSerializable(item);
      if (safeValue !== undefined) result[key] = safeValue;
    }
    return result;
  }
  return undefined;
}

function safeFormValues(role: OnboardingRole, formValues: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const field of SAFE_FIELDS[role]) {
    if (field in formValues) {
      const value = field === "documents" || field === "optionalDocuments"
        ? safeDocuments(formValues[field])
        : safeSerializable(formValues[field]);
      if (value !== undefined) result[field] = value;
    }
  }
  return result;
}

function safeDocuments(documents: unknown): OnboardingDocumentDraft[] {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter(isPlainObject)
    .map((document) => ({
      documentType: String(document.documentType || "").trim(),
      fileName: document.fileName ? String(document.fileName) : undefined,
    }))
    .filter((document) => document.documentType);
}

function normalizeCoordinates(value: unknown): OnboardingDraft["coordinates"] {
  if (!isPlainObject(value) || value.type !== "Point" || !Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
    return undefined;
  }
  const longitude = Number(value.coordinates[0]);
  const latitude = Number(value.coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return undefined;
  return { type: "Point", coordinates: [longitude, latitude] };
}

export function saveOnboardingDraft(
  userId: string,
  role: OnboardingRole,
  input: {
    activeStep: number;
    formValues: Record<string, unknown>;
    coordinates?: unknown;
    documents?: unknown;
  },
) {
  if (!storageAvailable() || !userId) return;
  const draft: OnboardingDraft = {
    version: 1,
    savedAt: Date.now(),
    activeStep: Number.isInteger(input.activeStep) ? input.activeStep : 0,
    formValues: safeFormValues(role, input.formValues),
    coordinates: normalizeCoordinates(input.coordinates),
    documents: safeDocuments(input.documents),
  };
  try {
    window.localStorage.setItem(draftKey(userId, role), JSON.stringify(draft));
  } catch {
    // Draft persistence is best-effort and must never block onboarding.
  }
}

export function loadOnboardingDraft(userId: string, role: OnboardingRole): OnboardingDraft | null {
  if (!storageAvailable() || !userId) return null;
  const key = draftKey(userId, role);
  let parsed: unknown;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }

  if (!isPlainObject(parsed) || parsed.version !== 1 || !Number.isFinite(parsed.savedAt) || Date.now() - Number(parsed.savedAt) > ONBOARDING_DRAFT_TTL_MS || !isPlainObject(parsed.formValues)) {
    window.localStorage.removeItem(key);
    return null;
  }

  return {
    version: 1,
    savedAt: Number(parsed.savedAt),
    activeStep: Number.isInteger(parsed.activeStep) ? Number(parsed.activeStep) : 0,
    formValues: safeFormValues(role, parsed.formValues),
    coordinates: normalizeCoordinates(parsed.coordinates),
    documents: safeDocuments(parsed.documents),
  };
}

export function clearOnboardingDraft(userId: string, role: OnboardingRole) {
  if (!storageAvailable() || !userId) return;
  window.localStorage.removeItem(draftKey(userId, role));
}

export function clearAllOnboardingDrafts() {
  if (!storageAvailable()) return;
  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(DRAFT_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
