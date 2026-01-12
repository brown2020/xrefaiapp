"use client";

import useProfileStore from "@/zustand/useProfileStore";
import { useCallback, useEffect, useState } from "react";
import { isIOSReactNativeWebView } from "@/utils/platform";
import { usePaymentsStore } from "@/zustand/usePaymentsStore";
import { inputClassName, labelClassName } from "@/components/ui/FormInput";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { AI_MODELS, listAiModels, resolveAiModelKey } from "@/ai/models";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";
import { CREDIT_PACKS, DEFAULT_CREDIT_PACK_ID, formatDollarsFromCents, getCreditPack } from "@/constants/creditPacks";

export default function ProfileComponent() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const [fireworksApiKey, setFireworksApiKey] = useState(
    profile.fireworks_api_key
  );
  const [openaiApiKey, setOpenaiApiKey] = useState(profile.openai_api_key);
  const [anthropicApiKey, setAnthropicApiKey] = useState(
    profile.anthropic_api_key
  );
  const [xaiApiKey, setXaiApiKey] = useState(profile.xai_api_key);
  const [googleApiKey, setGoogleApiKey] = useState(profile.google_api_key);
  const [stabilityAPIKey, setStabilityAPIKey] = useState(
    profile.stability_api_key
  );
  const [useCredits, setUseCredits] = useState(profile.useCredits);
  const [textModel, setTextModel] = useState(profile.text_model);
  const [showCreditsSection, setShowCreditsSection] = useState(true); // State to control visibility of credits section
  const [isSavingApiKeys, setIsSavingApiKeys] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [selectedPackId, setSelectedPackId] = useState<string>(DEFAULT_CREDIT_PACK_ID);
  const addCredits = useProfileStore((state) => state.addCredits);
  const addPayment = usePaymentsStore((state) => state.addPayment);

  useEffect(() => {
    const handleMessageFromRN = async (event: MessageEvent) => {
      // Critical: only accept IAP messages inside the native WebView.
      // On the normal web app, `window.postMessage` is user-controllable and
      // would allow free credit minting.
      if (!isIOSReactNativeWebView() || !window.ReactNativeWebView) return;

      const message = event.data;
      if (message?.type === "IAP_SUCCESS") {
        await addPayment({
          id: message.message,
          amount: message.amount,
          status: "succeeded",
          mode: "iap",
          platform: message.platform,
          productId: message.productId,
          currency: message.currency,
        });
        // Best-effort mapping until receipts are validated server-side.
        // Prefer explicit credits from native if provided; otherwise fall back to
        // the legacy 10,000 credits pack.
        const creditsToAdd =
          typeof message.credits === "number" && Number.isFinite(message.credits)
            ? Math.max(0, Math.floor(message.credits))
            : 10_000;
        await addCredits(creditsToAdd);
      }
    };

    // Listen for messages from the RN WebView
    window.addEventListener("message", handleMessageFromRN);

    return () => {
      window.removeEventListener("message", handleMessageFromRN);
    };
  }, [addCredits, addPayment]);

  useEffect(() => {
    setFireworksApiKey(profile.fireworks_api_key);
    setOpenaiApiKey(profile.openai_api_key);
    setAnthropicApiKey(profile.anthropic_api_key);
    setXaiApiKey(profile.xai_api_key);
    setGoogleApiKey(profile.google_api_key);
    setStabilityAPIKey(profile.stability_api_key);
    setTextModel(profile.text_model);

    // Hide credits section if in iOS WebView
    setShowCreditsSection(!isIOSReactNativeWebView());
  }, [
    profile.fireworks_api_key,
    profile.openai_api_key,
    profile.anthropic_api_key,
    profile.xai_api_key,
    profile.google_api_key,
    profile.stability_api_key,
    profile.text_model,
  ]);

  const handleApiKeyChange = async () => {
    const hasChanges =
      fireworksApiKey !== profile.fireworks_api_key ||
      openaiApiKey !== profile.openai_api_key ||
      anthropicApiKey !== profile.anthropic_api_key ||
      xaiApiKey !== profile.xai_api_key ||
      googleApiKey !== profile.google_api_key ||
      stabilityAPIKey !== profile.stability_api_key;

    if (!hasChanges) return;

    setIsSavingApiKeys(true);
    try {
      await updateProfile({
        fireworks_api_key: fireworksApiKey,
        openai_api_key: openaiApiKey,
        anthropic_api_key: anthropicApiKey,
        xai_api_key: xaiApiKey,
        google_api_key: googleApiKey,
        stability_api_key: stabilityAPIKey,
      });
    } catch (error) {
      console.error("Error updating API keys:", error);
    } finally {
      setIsSavingApiKeys(false);
    }
  };

  const handleTextModelChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const next = resolveAiModelKey(e.target.value);
    setTextModel(next);
    await updateProfile({ text_model: next });
  };

  const handleCreditsChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setUseCredits(e.target.value === "credits");
    await updateProfile({ useCredits: e.target.value === "credits" });
  };

  const normalizedModelKey = resolveAiModelKey(textModel);
  const selectedProvider = AI_MODELS[normalizedModelKey].provider;
  const hasSelectedProviderKey =
    selectedProvider === "openai"
      ? Boolean(openaiApiKey)
      : selectedProvider === "anthropic"
        ? Boolean(anthropicApiKey)
        : selectedProvider === "xai"
          ? Boolean(xaiApiKey)
          : Boolean(googleApiKey);
  const areApiKeysAvailable = Boolean(fireworksApiKey && hasSelectedProviderKey);

  const handleBuyClick = useCallback(() => {
    if (showCreditsSection) {
      const pack = getCreditPack(selectedPackId);
      window.location.href = `${ROUTES.paymentAttempt}?pack=${encodeURIComponent(
        pack.id
      )}&redirect=${encodeURIComponent(ROUTES.account)}`;
    } else {
      window.ReactNativeWebView?.postMessage("INIT_IAP");
    }
  }, [selectedPackId, showCreditsSection]);

  return (
    <div className="flex flex-col gap-4 ">
      <div className="bg-card border border-border rounded-2xl">
        <div className="flex flex-col sm:flex-row px-5 py-3 gap-3">
          <div className="flex items-center by-credits gap-2 pt-2 pb-2 w-full">
            <div className="w-[25%] usage-credits-block">
              <span className="text-foreground font-normal">Usage Credits:</span>
              <span className="text-accent font-semibold">
                {Math.round(profile.credits)}
              </span>
            </div>
            <div className="w-[48%] credits-block flex flex-col items-center gap-2">
              <div className="w-full max-w-xs">
                <label htmlFor="credit-pack" className={labelClassName}>
                  Credit pack:
                </label>
                <div className="relative">
                  <select
                    id="credit-pack"
                    value={selectedPackId}
                    onChange={(e) => setSelectedPackId(e.target.value)}
                    className={`${inputClassName} appearance-none`}
                    disabled={!showCreditsSection}
                  >
                    {CREDIT_PACKS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} — ${formatDollarsFromCents(p.amountCents)} →{" "}
                        {p.credits.toLocaleString()} credits
                        {p.badge ? ` (${p.badge})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>

              <button
                className="font-bold bg-primary hover:opacity-90 rounded-3xl text-primary-foreground w-56 block mx-auto px-3 py-2 flex-1 text-center transition-opacity disabled:opacity-60"
                onClick={handleBuyClick}
              >
                Buy credits
              </button>
            </div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground either-buy-credits px-5 pb-4">
          You can either buy credits or add your own API keys for Fireworks and
          OpenAI.
        </div>
      </div>

      <div className="flex flex-col p-5 space-y-3 bg-card border border-border rounded-2xl">
        <ApiKeyField
          id="fireworks-api-key"
          label="Fireworks API Key"
          value={fireworksApiKey}
          onChange={setFireworksApiKey}
          isVisible={Boolean(visibleKeys["fireworks"])}
          onToggleVisibility={() =>
            setVisibleKeys((p) => ({ ...p, fireworks: !p.fireworks }))
          }
          placeholder="Enter your Fireworks API Key"
        />
        <ApiKeyField
          id="openai-api-key"
          label="OpenAI API Key"
          value={openaiApiKey}
          onChange={setOpenaiApiKey}
          isVisible={Boolean(visibleKeys["openai"])}
          onToggleVisibility={() =>
            setVisibleKeys((p) => ({ ...p, openai: !p.openai }))
          }
          placeholder="Enter your OpenAI API Key"
        />
        <ApiKeyField
          id="anthropic-api-key"
          label="Anthropic API Key (optional)"
          value={anthropicApiKey}
          onChange={setAnthropicApiKey}
          isVisible={Boolean(visibleKeys["anthropic"])}
          onToggleVisibility={() =>
            setVisibleKeys((p) => ({ ...p, anthropic: !p.anthropic }))
          }
          placeholder="Enter your Anthropic API Key"
        />
        <ApiKeyField
          id="xai-api-key"
          label="xAI API Key (optional)"
          value={xaiApiKey}
          onChange={setXaiApiKey}
          isVisible={Boolean(visibleKeys["xai"])}
          onToggleVisibility={() =>
            setVisibleKeys((p) => ({ ...p, xai: !p.xai }))
          }
          placeholder="Enter your xAI API Key"
        />
        <ApiKeyField
          id="google-api-key"
          label="Google API Key (optional)"
          value={googleApiKey}
          onChange={setGoogleApiKey}
          isVisible={Boolean(visibleKeys["google"])}
          onToggleVisibility={() =>
            setVisibleKeys((p) => ({ ...p, google: !p.google }))
          }
          placeholder="Enter your Google API Key"
        />
        <ApiKeyField
          id="stability-api-key"
          label="Stability API Key"
          value={stabilityAPIKey}
          onChange={setStabilityAPIKey}
          isVisible={Boolean(visibleKeys["stability"])}
          onToggleVisibility={() =>
            setVisibleKeys((p) => ({ ...p, stability: !p.stability }))
          }
          placeholder="Enter your Stability API Key"
        />
        <button
          onClick={handleApiKeyChange}
          disabled={
            isSavingApiKeys ||
            (fireworksApiKey === profile.fireworks_api_key &&
              openaiApiKey === profile.openai_api_key &&
              anthropicApiKey === profile.anthropic_api_key &&
              xaiApiKey === profile.xai_api_key &&
              googleApiKey === profile.google_api_key &&
              stabilityAPIKey === profile.stability_api_key)
          }
          className="mt-2 w-56 font-bold bg-primary hover:opacity-90 rounded-3xl text-primary-foreground px-3 py-2 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed mx-auto transition-opacity flex items-center justify-center gap-2"
        >
          {isSavingApiKeys && <InlineSpinner size="sm" />}
          {isSavingApiKeys ? "Updating..." : "Update API Keys"}
        </button>
      </div>

      <div className="flex flex-col p-5 gap-2 bg-card border border-border rounded-2xl">
        <div>
          <label htmlFor="text-model" className={labelClassName}>
            Text model:
          </label>
        </div>
        <div className="relative">
          <select
            id="text-model"
            value={textModel}
            onChange={handleTextModelChange}
            className={`${inputClassName} appearance-none`}
          >
            {listAiModels().map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          API Keys mode requires Fireworks + the selected model provider key.
        </div>
      </div>

      <div className="flex flex-col p-5 gap-2 bg-card border border-border rounded-2xl">
        <div>
          <label htmlFor="toggle-use-credits" className={labelClassName}>
            Use:
          </label>
        </div>
        <div className="credit-option relative">
          <select
            id="toggle-use-credits"
            value={useCredits ? "credits" : "apikeys"}
            onChange={handleCreditsChange}
            className={`${inputClassName} appearance-none`}
            disabled={!areApiKeysAvailable}
          >
            <option value="credits">Credits</option>
            {areApiKeysAvailable && <option value="apikeys">API Keys</option>}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}

function ApiKeyField({
  id,
  label,
  value,
  onChange,
  isVisible,
  onToggleVisibility,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className={labelClassName}>
        {label}:
      </label>
      <div className="relative mt-1">
        <input
          type={isVisible ? "text" : "password"}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} pr-10`}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={isVisible ? "Hide API key" : "Show API key"}
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
