import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { AI_MODELS, resolveAiModelKey } from "../src/ai/models";
import { CREDITS_COSTS, getTextGenerationCreditsCost } from "../src/constants/credits";
import { CREDIT_PACKS } from "../src/constants/creditPacks";
import { STARTER_INTENTS } from "../src/constants/starterIntents";
import {
  chatRequestSchema,
  generationInputSchema,
  iapConfirmSchema,
} from "../src/utils/actionContracts";
import { authCookieOptions } from "../src/utils/authCookie";
import { resolveIapCreditGrant } from "../src/utils/iapGrant";
import { storeReceiptMatches } from "../src/utils/iapReceipt";
import { canonicalIapPayload } from "../src/utils/iapSignature";
import { clientCanWriteProfileField } from "../src/utils/profileContract";
import {
  boundChatInput,
  boundPromptPair,
  MAX_PROVIDER_INPUT_CHARS,
} from "../src/utils/providerInputBudget";
import { safeProxyHeaders } from "../src/utils/proxyResponse";
import { creditsForNewProfile } from "../src/utils/starterGrant";

test.describe("code reliability contracts", () => {
  test("proxy responses stay non-executable text", () => {
    const headers = safeProxyHeaders();
    const route = readFileSync("src/app/api/proxy/route.ts", "utf8");

    expect(headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(headers["content-type"]).not.toContain("text/html");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-disposition"]).toBe("attachment");
    expect(route).toContain("safeProxyHeaders()");
    expect(route).not.toContain("content-type\": response.headers");
  });

  test("IAP grants only a catalog pack at that pack's credit count", () => {
    for (const pack of CREDIT_PACKS) {
      expect(resolveIapCreditGrant(pack.id, pack.credits)).toEqual({
        ok: true,
        packId: pack.id,
        credits: pack.credits,
      });
      expect(resolveIapCreditGrant(pack.id, pack.credits + 1)).toEqual({
        ok: false,
        error: "IAP_CREDITS_MISMATCH",
      });
    }

    expect(resolveIapCreditGrant("iap", 1100)).toEqual({
      ok: false,
      error: "UNKNOWN_IAP_PRODUCT",
    });
    expect(resolveIapCreditGrant("starter", Number.NaN).ok).toBe(false);
  });

  test("IAP credits require a store receipt for the same product and transaction", () => {
    const source = readFileSync("src/actions/confirmIapPurchase.ts", "utf8");
    expect(source).toContain("verifyIapReceipt(");
    expect(canonicalIapPayload({
      transactionId: "tx",
      productId: "starter",
      amount: 1000,
      currency: "usd",
      platform: "ios",
      credits: 1100,
      ts: 1,
      receipt: "receipt-body",
    })).toContain("\"receipt\":\"receipt-body\"");

    const match = {
      status: 0,
      receipt: {
        in_app: [{ product_id: "starter", transaction_id: "tx-1" }],
      },
    };
    expect(storeReceiptMatches(match, { productId: "starter", transactionId: "tx-1" })).toBe(true);
    expect(storeReceiptMatches(match, { productId: "plus", transactionId: "tx-1" })).toBe(false);
    expect(storeReceiptMatches({ status: 21003 }, { productId: "starter", transactionId: "tx-1" })).toBe(false);
  });

  test("a claimed starter grant does not pay the initial balance again", () => {
    expect(creditsForNewProfile(false, 1000)).toBe(1000);
    expect(creditsForNewProfile(true, 1000)).toBe(0);
  });

  test("auth session cookies are HttpOnly", () => {
    expect(authCookieOptions(false).httpOnly).toBe(true);
    expect(authCookieOptions(true).secure).toBe(true);
    expect(authCookieOptions(false).secure).toBe(false);
    expect(authCookieOptions(true).sameSite).toBe("lax");
  });

  test("auth session rejects a missing token", async ({ request }) => {
    const response = await request.post("/api/auth/session", {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test("starter costs come from the credit pricing function", () => {
    const student = STARTER_INTENTS.find((intent) => intent.id === "student-study-guide");
    const creator = STARTER_INTENTS.find((intent) => intent.id === "creator-social-captions");

    expect(student?.estimatedCredits).toBe(CREDITS_COSTS.chatMessage);
    expect(creator?.estimatedCredits).toBe(getTextGenerationCreditsCost(160));
  });

  test("profile clients cannot write the credit balance", () => {
    expect(clientCanWriteProfileField("credits")).toBe(false);
    expect(clientCanWriteProfileField("email")).toBe(false);
    expect(clientCanWriteProfileField("displayName")).toBe(true);
    expect(readFileSync("src/actions/serverProfile.ts", "utf8")).toContain(
      "sanitizeProfileUpdate"
    );
  });

  test("chat, writing, and IAP contracts reject malformed payloads", async ({ request }) => {
    expect(chatRequestSchema.safeParse({ messages: [] }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] }).success).toBe(true);
    expect(generationInputSchema.safeParse({ type: "simple", systemPrompt: "", userPrompt: "" }).success).toBe(false);
    expect(generationInputSchema.safeParse({
      type: "simple",
      systemPrompt: "You are a fixture.",
      userPrompt: "Write one sentence.",
      requestedWordCount: 40,
    }).success).toBe(true);
    expect(iapConfirmSchema.safeParse({ transactionId: "", signature: "" }).success).toBe(false);

    const rejected = await request.post("/api/chat", {
      data: { messages: "not-a-list" },
    });
    expect(rejected.status()).toBe(400);
  });

  test("Google text generation uses the current Gemini model", () => {
    expect(AI_MODELS["google:gemini-3.1-pro-preview"].modelId).toBe("gemini-3.1-pro-preview");
    expect(resolveAiModelKey("google:gemini-3-pro-preview")).toBe(
      "google:gemini-3.1-pro-preview"
    );
    expect(JSON.stringify(AI_MODELS)).not.toContain("gemini-3-pro-preview");
  });

  test("provider input stays inside the credit budget", async ({ request }) => {
    const longSource = `word ${"detail ".repeat(20_000)}`;
    const bounded = boundPromptPair("Summarize this topic", longSource);
    expect(bounded.userPrompt.length).toBeLessThanOrEqual(MAX_PROVIDER_INPUT_CHARS);
    expect(bounded.userPrompt.split(/\s+/).length).toBeLessThanOrEqual(5_000);

    const tooLong = boundChatInput("a".repeat(MAX_PROVIDER_INPUT_CHARS + 1), []);
    expect(tooLong).toEqual({ ok: false, error: "PROMPT_TOO_LONG" });

    const history = boundChatInput("hello", [
      { prompt: "old", response: "old reply" },
      { prompt: "word ".repeat(6_000), response: "newer" },
    ]);
    expect(history.ok).toBe(true);
    if (history.ok) expect(history.history).toEqual([]);

    const rejected = await request.post("/api/chat", {
      data: {
        messages: [
          {
            role: "user",
            parts: [{ type: "text", text: "a".repeat(MAX_PROVIDER_INPUT_CHARS + 1) }],
          },
        ],
      },
    });
    expect(rejected.status()).toBe(400);
    expect(await rejected.json()).toEqual({ error: "PROMPT_TOO_LONG" });
  });

  test("the cookie action uses one label", () => {
    const provider = readFileSync("src/components/ClientProvider.tsx", "utf8");
    expect(provider).toContain('buttonText="Accept cookies"');
    expect(provider).toContain('ariaAcceptLabel="Accept cookies"');
  });

  test("auth session rejects a token the server cannot verify", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/session", {
      data: { idToken: "not-a-firebase-id-token" },
    });

    expect(response.status()).toBe(401);
  });
});
