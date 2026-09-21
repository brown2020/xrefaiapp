import { resolveAiModelKey } from "@/ai/models";

type ProfileUpdateFields = {
  email?: string;
  contactEmail?: string;
  displayName?: string;
  photoUrl?: string;
  emailVerified?: boolean;
  credits?: number;
  fireworks_api_key?: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
  xai_api_key?: string;
  google_api_key?: string;
  stability_api_key?: string;
  selectedAvatar?: string;
  selectedTalkingPhoto?: string;
  useCredits?: boolean;
  text_model?: string;
  firstName?: string;
  lastName?: string;
  headerUrl?: string;
};

const CLIENT_WRITABLE_FIELDS = {
  contactEmail: "string",
  displayName: "string",
  photoUrl: "string",
  fireworks_api_key: "string",
  openai_api_key: "string",
  anthropic_api_key: "string",
  xai_api_key: "string",
  google_api_key: "string",
  stability_api_key: "string",
  selectedAvatar: "string",
  selectedTalkingPhoto: "string",
  useCredits: "boolean",
  text_model: "model",
  firstName: "string",
  lastName: "string",
  headerUrl: "string",
} as const;

type ClientWritableProfileField = keyof typeof CLIENT_WRITABLE_FIELDS;

const MAX_STRING_FIELD_LENGTH = 4_000;

export function clientCanWriteProfileField(field: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLIENT_WRITABLE_FIELDS, field);
}

export function sanitizeProfileUpdate(
  fields: ProfileUpdateFields
): ProfileUpdateFields {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields) as [
    ClientWritableProfileField,
    unknown,
  ][]) {
    if (!clientCanWriteProfileField(key) || value === undefined) continue;
    if (typeof value === "function") continue;

    const expectedType = CLIENT_WRITABLE_FIELDS[key];
    if (expectedType === "boolean") {
      if (typeof value === "boolean") sanitized[key] = value;
      continue;
    }

    if (expectedType === "model") {
      if (typeof value === "string") sanitized[key] = resolveAiModelKey(value);
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, MAX_STRING_FIELD_LENGTH);
    }
  }

  return sanitized as ProfileUpdateFields;
}
