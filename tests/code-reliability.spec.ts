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
import { hasJwtShape } from "../src/utils/authErrors";
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

  test("xAI text generation uses the current Grok model", () => {
    expect(AI_MODELS["xai:grok-4.7"].modelId).toBe("grok-4.7");
    expect(resolveAiModelKey("xai:grok-4")).toBe("xai:grok-4.7");
    expect(JSON.stringify(AI_MODELS)).not.toContain("\"grok-4\"");
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

  test("text generation keeps a single conversation entry", () => {
    const source = readFileSync("src/actions/generateAIResponse.ts", "utf8");
    expect(source).toContain("export async function generateAIResponse(");
    expect(source).toContain("export async function generateResponse(");
    expect(source).not.toContain("generateResponseWithMemory");
  });

  test("a failed purchase keeps the real balance and a plain next step", () => {
    const page = readFileSync("src/components/PaymentSuccessPage.tsx", "utf8");
    const badge = readFileSync("src/components/ui/CreditsBadge.tsx", "utf8");
    expect(page).toContain(
      "We could not confirm this purchase. Your balance was not changed."
    );
    expect(page).not.toContain("Missing session_id");
    expect(badge).toContain("Credits balance loading");
    expect(badge).toContain("profileLoaded");
    expect(readFileSync("src/app/globals.css", "utf8")).toContain(
      "prefers-reduced-motion: reduce"
    );
    const history = readFileSync("src/components/History.tsx", "utf8");
    expect(history).toContain("Nothing saved yet.");
    expect(history).toContain("Could not load history. Please try again.");
    expect(history).not.toContain("No history found.");
  });

  test("advisory floors stay on the patched next, postcss, and sharp lines", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies: { next: string; sharp: string };
      devDependencies: { "@next/eslint-plugin-next": string; postcss: string };
      overrides: { postcss: string };
    };
    expect(pkg.dependencies.next).toBe("^16.3.6");
    expect(pkg.devDependencies["@next/eslint-plugin-next"]).toBe("^16.3.6");
    expect(pkg.dependencies.sharp).toBe("^0.35.4");
    expect(pkg.devDependencies.postcss).toBe("8.5.28");
    expect(pkg.overrides.postcss).toBe("8.5.28");
  });

  test("setup commands and env names match the docs", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    const readme = readFileSync("README.md", "utf8");
    const agents = readFileSync("AGENTS.md", "utf8");
    for (const script of Object.keys(pkg.scripts)) {
      expect(pkg.scripts[script]).toBeTruthy();
      expect(readme).toContain(`npm run ${script}`);
    }
    expect(readme).toContain("npm install");
    for (const name of [
      "APPLE_IAP_SHARED_SECRET",
      "IAP_RECEIPT_VERIFY_URL",
      "ALLOW_UNVERIFIED_SESSION_COOKIE",
    ]) {
      expect(agents).toContain(name);
      expect(readme).toContain(name);
      expect(readFileSync(".env.example", "utf8")).toContain(name);
    }
    expect(agents).toContain("deployment owner owns configuration drift");
    expect(agents).toContain(".github/workflows/ci.yml");
    expect(readFileSync("docs/architecture.md", "utf8")).toContain("no Stripe webhook");
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

  test("the session pre-check accepts unsigned emulator tokens and rejects non-JWTs", () => {
    expect(hasJwtShape("header.payload.")).toBe(true);
    expect(hasJwtShape("header.payload.signature")).toBe(true);
    expect(hasJwtShape("not-a-firebase-id-token")).toBe(false);
    expect(hasJwtShape(".payload.signature")).toBe(false);
    expect(hasJwtShape("header..signature")).toBe(false);
  });

  test("a missing Admin config never authorizes a request or sets an unverified cookie by default", () => {
    for (const file of ["src/utils/requireAuthedRequest.ts", "src/actions/serverAuth.ts"]) {
      expect(readFileSync(file, "utf8")).toContain(
        'if (!isAdminConfigured()) throw new Error("AUTH_REQUIRED");'
      );
    }
    const session = readFileSync("src/app/api/auth/session/route.ts", "utf8");
    expect(session).toContain('process.env.ALLOW_UNVERIFIED_SESSION_COOKIE === "true"');
    expect(session).toContain("status: 503");
    expect(session).not.toMatch(/project_id\|service account/);
  });
});
