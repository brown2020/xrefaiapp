import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { AI_MODELS, resolveAiModelKey } from "../src/ai/models";
import { CREDITS_COSTS, getTextGenerationCreditsCost } from "../src/constants/credits";
import { CREDIT_PACKS, findCreditPack } from "../src/constants/creditPacks";
import { STARTER_INTENTS } from "../src/constants/starterIntents";
import {
  chatRequestSchema,
  generationInputSchema,
  iapConfirmSchema,
} from "../src/utils/actionContracts";
import { authCookieOptions } from "../src/utils/authCookie";
import { hasJwtShape } from "../src/utils/authErrors";
import { resolveIapCreditGrant } from "../src/utils/iapGrant";
import { iapReceiptOverrideUrlFrom, storeReceiptMatches } from "../src/utils/iapReceipt";
import { canonicalIapPayload } from "../src/utils/iapSignature";
import { clientCanWriteProfileField } from "../src/utils/profileContract";
import { isAiConsentExemptPath } from "../src/constants/aiConsent";
import {
  classifyImageProviderError,
  IMAGE_CONTENT_REJECTED,
  IMAGE_GENERATION_FAILED,
  IMAGE_MISSING_OPENAI_KEY,
  imageFailureMessage,
} from "../src/utils/imageErrors";
import {
  boundChatInput,
  boundPromptPair,
  MAX_PROVIDER_INPUT_CHARS,
} from "../src/utils/providerInputBudget";
import { safeProxyHeaders } from "../src/utils/proxyResponse";
import { creditsForNewProfile, starterCreditsToAdd } from "../src/utils/starterGrant";
import { allowsUnverifiedSessionCookieFrom } from "../src/utils/sessionCookiePolicy";
import { paidCheckoutMatchesPack } from "../src/utils/stripeCheckout";
import { providerKeysForRequest } from "../src/utils/providerRequestKeys";

test.describe("code reliability contracts", () => {
  test("Firebase Admin auth loads where Node cannot require() ES modules", () => {
    // Vercel's function runtime rejected jwks-rsa's require("jose") with
    // ERR_REQUIRE_ESM, taking down every route that imports firebase-admin.
    const output = execFileSync(
      process.execPath,
      ["--no-experimental-require-module", "-e", "require('firebase-admin/auth'); console.log('ok')"],
      { encoding: "utf8" }
    );
    expect(output.trim()).toBe("ok");
  });

  test("markdown output gets typography styles", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));

    expect(css).toContain('@plugin "@tailwindcss/typography";');
    expect(pkg.devDependencies["@tailwindcss/typography"]).toBeTruthy();
    expect(readFileSync("src/components/History.tsx", "utf8")).toContain("prose");
  });

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

    const expected = { productId: "starter", transactionId: "tx-1", bundleId: "ai.xref.app" };
    const match = {
      status: 0,
      receipt: {
        bundle_id: "ai.xref.app",
        in_app: [{ product_id: "starter", transaction_id: "tx-1", original_transaction_id: "orig-1" }],
      },
    };
    expect(storeReceiptMatches(match, expected)).toBe(true);
    expect(storeReceiptMatches(match, { ...expected, productId: "plus" })).toBe(false);
    expect(storeReceiptMatches(match, { ...expected, transactionId: "orig-1" })).toBe(false);
    expect(storeReceiptMatches(match, { ...expected, bundleId: "com.other.app" })).toBe(false);
    expect(storeReceiptMatches({ status: 21003 }, expected)).toBe(false);
    const withAppItem = {
      status: 0,
      receipt: { ...match.receipt, app_item_id: 123 },
    };
    expect(storeReceiptMatches(withAppItem, expected)).toBe(false);
    expect(storeReceiptMatches(withAppItem, { ...expected, appItemId: "123" })).toBe(true);
  });

  test("a claimed starter grant does not pay the initial balance again", () => {
    expect(creditsForNewProfile(false, 1000)).toBe(1000);
    expect(creditsForNewProfile(true, 1000)).toBe(0);
    expect(starterCreditsToAdd({
      profileExists: false,
      claimState: "missing",
      initialCredits: 1000,
    })).toBe(1000);
    expect(starterCreditsToAdd({
      profileExists: true,
      claimState: "missing",
      initialCredits: 1000,
    })).toBe(0);
    expect(starterCreditsToAdd({
      profileExists: true,
      claimState: "pending",
      initialCredits: 1000,
    })).toBe(1000);
  });

  test("chat refuses a short balance before the model and shows one message", () => {
    const route = readFileSync("src/app/api/chat/route.ts", "utf8");
    const debitAt = route.indexOf("debitCreditsIdempotent");
    const modelAt = route.indexOf("getTextModel(");
    const streamAt = route.indexOf("streamText(");
    expect(debitAt).toBeGreaterThan(0);
    expect(modelAt).toBeGreaterThan(debitAt);
    expect(streamAt).toBeGreaterThan(modelAt);

    const chat = readFileSync("src/components/Chat.tsx", "utf8");
    const errorAt = chat.indexOf("if (isError)");
    const emptyAt = chat.indexOf("The model returned no reply");
    expect(errorAt).toBeGreaterThan(0);
    expect(emptyAt).toBeGreaterThan(errorAt);
    expect(chat).toContain("generationConfig.credits < CREDITS_COSTS.chatMessage");
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
    expect(clientCanWriteProfileField("aiConsentVersion")).toBe(false);
    expect(clientCanWriteProfileField("aiConsentAt")).toBe(false);
    expect(readFileSync("src/actions/serverProfile.ts", "utf8")).toContain(
      "sanitizeProfileUpdate"
    );
  });

  test("image failures distinguish content refusals from outages", () => {
    expect(
      classifyImageProviderError(
        "Your request was rejected as a result of our safety system."
      )
    ).toBe(IMAGE_CONTENT_REJECTED);
    expect(classifyImageProviderError("moderation_blocked")).toBe(IMAGE_CONTENT_REJECTED);
    expect(classifyImageProviderError("fetch failed")).toBe(IMAGE_GENERATION_FAILED);
    expect(imageFailureMessage(IMAGE_GENERATION_FAILED)).not.toMatch(/real people/);
    expect(imageFailureMessage(IMAGE_CONTENT_REJECTED)).toMatch(/real people/);
    expect(imageFailureMessage(IMAGE_MISSING_OPENAI_KEY)).toMatch(/OpenAI API key/);
  });

  test("image provider timeout ends before the route is killed so refunds run", () => {
    // Vercel stops a function at maxDuration without running catch blocks,
    // which would keep the 300-credit image debit.
    const route = readFileSync("src/app/tools/page.tsx", "utf8");
    const action = readFileSync("src/actions/generateImage.ts", "utf8");
    const maxDurationSeconds = Number(route.match(/export const maxDuration = (\d+);/)?.[1]);
    const timeoutMs = Number(
      action.match(/IMAGE_PROVIDER_TIMEOUT_MS = ([\d_]+);/)?.[1].replaceAll("_", "")
    );
    expect(maxDurationSeconds).toBeGreaterThan(0);
    expect(timeoutMs).toBeGreaterThan(30_000);
    expect(timeoutMs).toBeLessThanOrEqual(maxDurationSeconds * 1000 - 15_000);
    expect(action).toContain("AbortSignal.timeout(IMAGE_PROVIDER_TIMEOUT_MS)");
    expect(action).not.toContain("03-17-2125");
    expect(action).toContain('version: "v4"');
  });

  test("text streams time out before the function is killed", () => {
    const timeoutMs = Number(
      readFileSync("src/constants/index.ts", "utf8")
        .match(/TEXT_PROVIDER_TIMEOUT_MS = ([\d_]+);/)?.[1]
        .replaceAll("_", "")
    );
    for (const file of [
      "src/app/api/chat/route.ts",
      "src/app/history/page.tsx",
      "src/app/tools/page.tsx",
    ]) {
      const maxDurationSeconds = Number(
        readFileSync(file, "utf8").match(/export const maxDuration = (\d+);/)?.[1]
      );
      expect(maxDurationSeconds, file).toBe(120);
      expect(timeoutMs).toBeLessThan(maxDurationSeconds * 1000 - 15_000);
    }
    for (const file of ["src/app/api/chat/route.ts", "src/actions/generateAIResponse.ts"]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("AbortSignal.timeout(TEXT_PROVIDER_TIMEOUT_MS)");
      expect(source, file).toContain("debitCreditsIdempotent");
    }
  });

  test("AI consent gate leaves policies, help, and account deletion reachable", () => {
    for (const path of ["/privacy", "/terms", "/support", "/account"]) {
      expect(isAiConsentExemptPath(path)).toBe(true);
    }
    for (const path of ["/", "/chat", "/tools", "/history", "/accounting"]) {
      expect(isAiConsentExemptPath(path)).toBe(false);
    }
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
    expect(source).toContain("\nasync function generateAIResponse(");
    expect(source).not.toContain("export async function generateAIResponse(");
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

  test("keyboard focus stays visible on shared buttons", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/:focus-visible\s*\{\s*outline: 2px solid var\(--ring\)/);
    for (const block of css.match(/@utility btn-[\w-]+ \{[^}]*\}/g) ?? []) {
      expect(block).not.toMatch(/outline-(hidden|none)/);
    }
    expect(css).toContain("transition-duration: 0.01ms !important");
  });

  test("advisory floors stay on the patched next, postcss, sharp, and grpc lines", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies: { next: string; sharp: string };
      devDependencies: { "@next/eslint-plugin-next": string; postcss: string };
      overrides: { postcss: string; "@grpc/grpc-js": string; "postcss-selector-parser": string };
    };
    expect(pkg.overrides["postcss-selector-parser"]).toBe("^7.1.6");
    expect(pkg.dependencies.next).toBe("^16.4.3");
    expect(pkg.devDependencies["@next/eslint-plugin-next"]).toBe("^16.4.3");
    expect(pkg.dependencies.sharp).toBe("^0.35.5");
    expect(pkg.devDependencies.postcss).toBe("8.5.32");
    expect(pkg.overrides.postcss).toBe("8.5.32");
    expect(pkg.overrides["@grpc/grpc-js"]).toBe("^1.14.6");
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
      "STRIPE_WEBHOOK_SECRET",
      "APPLE_BUNDLE_ID",
      "APPLE_APP_ITEM_ID",
    ]) {
      expect(agents).toContain(name);
      expect(readme).toContain(name);
      expect(readFileSync(".env.example", "utf8")).toContain(name);
    }
    expect(agents).toContain("deployment owner owns configuration drift");
    expect(agents).toContain(".github/workflows/ci.yml");
    expect(readFileSync("docs/architecture.md", "utf8")).toContain("/api/billing/webhook");
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
    expect(session).toContain("allowsUnverifiedSessionCookie()");
    expect(session).toContain("status: 503");
    expect(session).not.toMatch(/project_id\|service account/);
    expect(allowsUnverifiedSessionCookieFrom("production", "true")).toBe(false);
    expect(allowsUnverifiedSessionCookieFrom("test", "true")).toBe(true);
    expect(allowsUnverifiedSessionCookieFrom("development", "false")).toBe(false);
    expect(readFileSync("src/utils/verifiedIdToken.ts", "utf8")).toContain(
      "verifyIdToken(idToken, true)"
    );
    expect(readFileSync("src/utils/verifiedIdToken.ts", "utf8")).toContain(
      "isAllowedSignInProvider"
    );
  });

  test("an empty or filtered completion is refunded and the client keeps the prompt", () => {
    expect(readFileSync("src/app/api/chat/route.ts", "utf8")).toMatch(
      /onEnd: async \(\{ text \}\) => \{[^}]*if \(text\.trim\(\)\) \{\s*await settleSuccess\(\);\s*\} else \{\s*await settleFailure\(\);/
    );
    expect(readFileSync("src/actions/generateAIResponse.ts", "utf8")).toMatch(
      /onEnd: \(\{ text \}\) => \{[^}]*void \(text\.trim\(\) \? settleSuccess\(\) : settleFailure\(\)\);/
    );
    const chat = readFileSync("src/components/Chat.tsx", "utf8");
    expect(chat).toContain("setInput((current) => current || draft);");
    for (const file of [
      "src/components/BasePrompt.tsx",
      "src/components/SummarizeTopic.tsx",
      "src/components/History.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toContain("throw new EmptyCompletionError()");
    }
  });

  test("server code uses the modular Firebase Admin entry points", () => {
    for (const file of readdirSync("src", { recursive: true, encoding: "utf8" })) {
      if (!/\.tsx?$/.test(file)) continue;
      const source = readFileSync(join("src", file), "utf8");
      expect(source, file).not.toMatch(/from "firebase-admin";|FirebaseFirestore\.|admin\.firestore/);
    }
  });

  test("client bundles exclude the Node crypto polyfill", () => {
    const chunks = readdirSync(".next/static/chunks").filter((f) => f.endsWith(".js"));
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      const source = readFileSync(join(".next/static/chunks", chunk), "utf8");
      expect(source, chunk).not.toContain('case"RSA PRIVATE KEY"');
    }
  });

  test("each debit gets its own refund id so a retried key stays refundable", () => {
    const chatRoute = readFileSync("src/app/api/chat/route.ts", "utf8");
    expect(chatRoute).toContain("const refundId = `refund_chat_${idempotencyKey}_${randomUUID()}`;");
    expect(chatRoute).toContain("deterministicId: refundId,");
    expect(readFileSync("src/actions/generateAIResponse.ts", "utf8")).toContain(
      "deterministicId: `refund_generation_${idempotencyKey}_${refundAttemptId}`,"
    );
  });

  test("History deletes are signed-in, owner-scoped, and id-checked", () => {
    const source = readFileSync("src/actions/serverHistory.ts", "utf8");
    for (const name of ["deleteHistoryItemServer", "clearHistoryServer"]) {
      const body = source.slice(source.indexOf(`export async function ${name}(`));
      expect(body.slice(0, 200)).toContain("await requireAuthedUid();");
    }
    expect(source).toContain("adminDb.doc(`users/${uid}/summaries/${id}`).delete()");
    expect(source).toContain('throw new Error("INVALID_HISTORY_ID")');
    expect(source).toContain("deleteStoredImage");
  });

  test("billing rejects the wrong currency and an unknown pack", () => {
    const plus = findCreditPack("plus");
    expect(plus).toBeTruthy();
    expect(paidCheckoutMatchesPack({ amount_total: plus!.amountCents, currency: "usd" }, plus!)).toBe(true);
    expect(paidCheckoutMatchesPack({ amount_total: plus!.amountCents, currency: "eur" }, plus!)).toBe(false);
    expect(findCreditPack("not-a-pack")).toBeUndefined();
    expect(readFileSync("src/components/PaymentAttemptClient.tsx", "utf8")).toContain("findCreditPack");
    expect(readFileSync("src/components/PaymentAttemptClient.tsx", "utf8")).toContain("Unknown credit pack");
    expect(readFileSync("src/app/api/billing/checkout/route.ts", "utf8")).toContain(
      "adaptive_pricing: { enabled: false }"
    );
    const webhook = readFileSync("src/app/api/billing/webhook/route.ts", "utf8");
    expect(webhook).toContain("constructEvent");
    expect(webhook).toContain("status: 503");
    expect(webhook).toContain("STRIPE_WEBHOOK_SECRET");
  });

  test("credits-mode requests omit profile provider keys", () => {
    expect(providerKeysForRequest(true, {
      openaiApiKey: "sk-user",
      anthropicApiKey: "sk-ant",
      xaiApiKey: "sk-x",
      googleApiKey: "sk-g",
    })).toEqual({});
    expect(providerKeysForRequest(false, { openaiApiKey: "sk-user" }).openaiApiKey).toBe("sk-user");
    expect(readFileSync("src/components/Chat.tsx", "utf8")).toContain("providerKeysForRequest");
  });

  test("receipt override and client rules stay closed in production", () => {
    expect(iapReceiptOverrideUrlFrom({
      nodeEnv: "production",
      override: "https://evil.example/verify",
    })).toBeNull();
    expect(iapReceiptOverrideUrlFrom({
      nodeEnv: "production",
      override: "http://127.0.0.1:3332/verify",
      authEmulatorHost: "127.0.0.1:9099",
    })).toBe("http://127.0.0.1:3332/verify");

    const firestore = readFileSync("firestore.rules", "utf8");
    expect(firestore).toContain("allow write: if false");
    expect(firestore).toContain("match /iapTransactions/{id}");
    expect(firestore).toContain("match /stripePaymentIntents/{id}");
    const storage = readFileSync("storage.rules", "utf8");
    expect(storage).toContain("match /generated/{uid}/{allPaths=**}");
    expect(storage).toContain('request.resource.contentType == "image/png"');
    expect(storage).toMatch(/match \/generated\/\{uid\}\/\{allPaths=\*\*\} \{\s*allow read, write: if false;/);

    const cors = JSON.parse(readFileSync("cors.json", "utf8")) as { origin: string[] }[];
    expect(cors.some((entry) => entry.origin.includes("*"))).toBe(false);
    expect(cors[0]?.origin).toEqual(["https://xref.ai", "https://www.xref.ai"]);

    const nextConfig = readFileSync("next.config.mjs", "utf8");
    expect(nextConfig).toContain("frame-ancestors 'none'");
    expect(nextConfig).toContain("nosniff");

    const limiter = readFileSync("src/utils/rateLimit.ts", "utf8");
    expect(limiter).toContain("proxy: { maxRequests: 10, windowMs: 60_000 }");
    expect(limiter).toContain('FAIL_CLOSED_ENDPOINTS = new Set(["chat", "image", "tools", "proxy"])');
    expect(readFileSync("src/app/api/proxy/route.ts", "utf8")).toContain('rateLimitMiddleware(uid, "proxy")');
  });

  test("the payment store cannot write payment records", () => {
    const actions = readFileSync("src/actions/serverPayments.ts", "utf8");
    expect(actions).not.toMatch(/\.set\(|\.add\(|\.update\(/);
    expect(readFileSync("src/zustand/usePaymentsStore.ts", "utf8")).not.toContain("addPayment");
  });
});
