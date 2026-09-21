import { z } from "zod";

const providerKey = z.string().max(4_000).optional();

const providerFields = {
  modelKey: z.string().max(200).optional(),
  useCredits: z.boolean().optional(),
  openaiApiKey: providerKey,
  anthropicApiKey: providerKey,
  xaiApiKey: providerKey,
  googleApiKey: providerKey,
  idempotencyKey: z.string().min(1).max(200).optional(),
};

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string().min(1),
        content: z.unknown().optional(),
        parts: z
          .array(
            z.object({
              type: z.string(),
              text: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .min(1),
  history: z
    .array(
      z.object({
        prompt: z.string(),
        response: z.string(),
      })
    )
    .optional(),
  ...providerFields,
});

export const generationInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("simple"),
    systemPrompt: z.string(),
    userPrompt: z.string().min(1),
    requestedWordCount: z.number().finite().optional(),
    ...providerFields,
  }),
  z.object({
    type: z.literal("conversation"),
    systemPrompt: z.string(),
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    ),
    ...providerFields,
  }),
]);

export const iapConfirmSchema = z.object({
  transactionId: z.string().min(1).max(255),
  productId: z.string().min(1).max(200),
  amount: z.number().finite(),
  currency: z.string().min(1).max(8),
  platform: z.string().min(1).max(32),
  credits: z.number().finite(),
  ts: z.number().finite(),
  receipt: z.string(),
  signature: z.string().min(1),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type GenerationInput = z.infer<typeof generationInputSchema>;
export type IapConfirmContract = z.infer<typeof iapConfirmSchema>;
