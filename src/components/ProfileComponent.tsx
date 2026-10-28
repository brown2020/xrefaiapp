"use client";

import useProfileStore from "@/zustand/useProfileStore";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useShowWebOnly } from "@/hooks/useShowWebOnly";
import {
  cardClassName,
  inputClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/ui/FormInput";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { AI_MODELS, listAiModels, resolveAiModelKey } from "@/ai/models";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";
import {
  CREDIT_PACKS,
  DEFAULT_CREDIT_PACK_ID,
  formatDollarsFromCents,
  findCreditPack,
} from "@/constants/creditPacks";
import toast from "react-hot-toast";
import { VerifyEmailNotice } from "@/components/VerifyEmailNotice";

const creditsFormatter = new Intl.NumberFormat();

type ApiKeyName =
  | "openai"
  | "anthropic"
  | "xai"
  | "google";

export default function ProfileComponent() {
  const router = useRouter();
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);

  const [openaiApiKey, setOpenaiApiKey] = useState(profile.openai_api_key);
  const [anthropicApiKey, setAnthropicApiKey] = useState(profile.anthropic_api_key);
  const [xaiApiKey, setXaiApiKey] = useState(profile.xai_api_key);
  const [googleApiKey, setGoogleApiKey] = useState(profile.google_api_key);
  const [isSavingApiKeys, setIsSavingApiKeys] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [selectedPackId, setSelectedPackId] =
    useState<string>(DEFAULT_CREDIT_PACK_ID);

  // Track whether the user has edited each API-key field so we don't clobber
  // in-progress typing when the profile refreshes (e.g. after a credit debit).
  const isDirtyRef = useRef({
    openai: false,
    anthropic: false,
    xai: false,
    google: false,
  });

  const canBuyCredits = useShowWebOnly();

  // Sync individual key inputs from the profile only when the user hasn't
  // actively edited that particular field.
  useEffect(() => {
    if (!isDirtyRef.current.openai) setOpenaiApiKey(profile.openai_api_key);
    if (!isDirtyRef.current.anthropic) setAnthropicApiKey(profile.anthropic_api_key);
    if (!isDirtyRef.current.xai) setXaiApiKey(profile.xai_api_key);
    if (!isDirtyRef.current.google) setGoogleApiKey(profile.google_api_key);
  }, [
    profile.openai_api_key,
    profile.anthropic_api_key,
    profile.xai_api_key,
    profile.google_api_key,
  ]);

  const handleApiKeyChange = async () => {
    const hasChanges =
      openaiApiKey !== profile.openai_api_key ||
      anthropicApiKey !== profile.anthropic_api_key ||
      xaiApiKey !== profile.xai_api_key ||
      googleApiKey !== profile.google_api_key;

    if (!hasChanges) return;

    setIsSavingApiKeys(true);
    try {
      await updateProfile({
        openai_api_key: openaiApiKey,
        anthropic_api_key: anthropicApiKey,
        xai_api_key: xaiApiKey,
        google_api_key: googleApiKey,
      });
      // Reset dirty flags on successful save so subsequent profile refreshes can sync.
      isDirtyRef.current = {
        openai: false,
        anthropic: false,
        xai: false,
        google: false,
      };
      toast.success("API keys saved");
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
    await updateProfile({ text_model: next });
  };

  const handleCreditsChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    await updateProfile({ useCredits: e.target.value === "credits" });
  };

  const normalizedModelKey = resolveAiModelKey(profile.text_model);
  const selectedProvider = AI_MODELS[normalizedModelKey].provider;
  const hasSelectedProviderKey =
    selectedProvider === "openai"
      ? Boolean(openaiApiKey)
      : selectedProvider === "anthropic"
        ? Boolean(anthropicApiKey)
        : selectedProvider === "xai"
          ? Boolean(xaiApiKey)
          : Boolean(googleApiKey);
  const areApiKeysAvailable = hasSelectedProviderKey;

  // If the user is in apikeys mode but keys become unavailable, force credits mode
  // so the backend doesn't receive `useCredits: false` with no API key.
  useEffect(() => {
    if (!areApiKeysAvailable && !profile.useCredits) {
      void updateProfile({ useCredits: true });
    }
  }, [areApiKeysAvailable, profile.useCredits, updateProfile]);

  const handleBuyClick = useCallback(() => {
    const pack = findCreditPack(selectedPackId);
    if (!pack) return;
    router.push(
      `${ROUTES.paymentAttempt}?pack=${encodeURIComponent(
        pack.id
      )}&redirect=${encodeURIComponent(ROUTES.account)}`,
    );
  }, [selectedPackId, router]);

  // Effective select value — if apikeys isn't available, always show "credits"
  const useCreditsSelectValue =
    profile.useCredits || !areApiKeysAvailable ? "credits" : "apikeys";

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="credits-heading" className={cardClassName}>
        <h2 id="credits-heading" className="text-lg font-bold text-foreground">
          Credits
        </h2>
        <div className="mt-3">
          <VerifyEmailNotice />
        </div>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Balance</div>
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {creditsFormatter.format(Math.round(profile.credits))}{" "}
              <span className="text-base font-semibold text-muted-foreground">
                credits
              </span>
            </div>
          </div>
          {canBuyCredits ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end md:w-auto">
              <div className="w-full sm:min-w-80">
                <label htmlFor="credit-pack" className={labelClassName}>
                  Credit pack
                </label>
                <div className="relative">
                  <select
                    id="credit-pack"
                    value={selectedPackId}
                    onChange={(e) => setSelectedPackId(e.target.value)}
                    className={`${inputClassName} appearance-none pr-10`}
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
                    aria-hidden
                    className="absolute right-4 top-1/2 mt-0.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                </div>
              </div>
              <button
                type="button"
                className={`${primaryButtonClassName} shrink-0 sm:py-3`}
                onClick={handleBuyClick}
              >
                Buy credits
              </button>
            </div>
          ) : null}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {canBuyCredits
            ? "Buy credits, or add your own provider keys below and switch billing to API keys."
            : "Add your own provider keys below and switch billing to API keys to keep going when credits run out."}
        </p>
      </section>

      <ApiKeysPanel
        openaiApiKey={openaiApiKey}
        anthropicApiKey={anthropicApiKey}
        xaiApiKey={xaiApiKey}
        googleApiKey={googleApiKey}
        savedOpenaiApiKey={profile.openai_api_key}
        savedAnthropicApiKey={profile.anthropic_api_key}
        savedXaiApiKey={profile.xai_api_key}
        savedGoogleApiKey={profile.google_api_key}
        visibleKeys={visibleKeys}
        isSaving={isSavingApiKeys}
        onChange={(key, value) => {
          isDirtyRef.current[key] = true;
          const setters = {
            openai: setOpenaiApiKey,
            anthropic: setAnthropicApiKey,
            xai: setXaiApiKey,
            google: setGoogleApiKey,
          };
          setters[key](value);
        }}
        onToggleVisibility={(key) =>
          setVisibleKeys((current) => ({ ...current, [key]: !current[key] }))
        }
        onSave={handleApiKeyChange}
      />

      <section aria-labelledby="model-heading" className={cardClassName}>
        <h2 id="model-heading" className="text-lg font-bold text-foreground">
          Model and billing
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="text-model" className={labelClassName}>
              Text model
            </label>
            <div className="relative">
              <select
                id="text-model"
                value={normalizedModelKey}
                onChange={handleTextModelChange}
                className={`${inputClassName} appearance-none pr-10`}
              >
                {listAiModels().map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                aria-hidden
                className="absolute right-4 top-1/2 mt-0.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="toggle-use-credits" className={labelClassName}>
              Pay with
            </label>
            <div className="relative">
              <select
                id="toggle-use-credits"
                value={useCreditsSelectValue}
                onChange={handleCreditsChange}
                className={`${inputClassName} appearance-none pr-10`}
                disabled={!areApiKeysAvailable}
              >
                <option value="credits">Credits</option>
                {areApiKeysAvailable && <option value="apikeys">API keys</option>}
              </select>
              <ChevronDown
                size={16}
                aria-hidden
                className="absolute right-4 top-1/2 mt-0.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Paying with API keys needs a key for the selected model&rsquo;s
          provider. Image tools always use your OpenAI key.
        </p>
      </section>
    </div>
  );
}

function ApiKeysPanel({
  openaiApiKey,
  anthropicApiKey,
  xaiApiKey,
  googleApiKey,
  savedOpenaiApiKey,
  savedAnthropicApiKey,
  savedXaiApiKey,
  savedGoogleApiKey,
  visibleKeys,
  isSaving,
  onChange,
  onToggleVisibility,
  onSave,
}: {
  openaiApiKey: string;
  anthropicApiKey: string;
  xaiApiKey: string;
  googleApiKey: string;
  savedOpenaiApiKey: string;
  savedAnthropicApiKey: string;
  savedXaiApiKey: string;
  savedGoogleApiKey: string;
  visibleKeys: Record<string, boolean>;
  isSaving: boolean;
  onChange: (key: ApiKeyName, value: string) => void;
  onToggleVisibility: (key: ApiKeyName) => void;
  onSave: () => void;
}) {
  const isUnchanged =
    openaiApiKey === savedOpenaiApiKey &&
    anthropicApiKey === savedAnthropicApiKey &&
    xaiApiKey === savedXaiApiKey &&
    googleApiKey === savedGoogleApiKey;

  return (
    <section aria-labelledby="api-keys-heading" className={cardClassName}>
      <h2 id="api-keys-heading" className="text-lg font-bold text-foreground">
        Your API keys
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Keys are stored on your account and used only when you pay with API
        keys.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ApiKeyField
          id="openai-api-key"
          label="OpenAI API key"
          value={openaiApiKey}
          onChange={(value) => onChange("openai", value)}
          isVisible={Boolean(visibleKeys.openai)}
          onToggleVisibility={() => onToggleVisibility("openai")}
          placeholder="sk-…"
        />
        <ApiKeyField
          id="anthropic-api-key"
          label="Anthropic API key"
          value={anthropicApiKey}
          onChange={(value) => onChange("anthropic", value)}
          isVisible={Boolean(visibleKeys.anthropic)}
          onToggleVisibility={() => onToggleVisibility("anthropic")}
          placeholder="sk-ant-…"
        />
        <ApiKeyField
          id="xai-api-key"
          label="xAI API key"
          value={xaiApiKey}
          onChange={(value) => onChange("xai", value)}
          isVisible={Boolean(visibleKeys.xai)}
          onToggleVisibility={() => onToggleVisibility("xai")}
          placeholder="xai-…"
        />
        <ApiKeyField
          id="google-api-key"
          label="Google API key"
          value={googleApiKey}
          onChange={(value) => onChange("google", value)}
          isVisible={Boolean(visibleKeys.google)}
          onToggleVisibility={() => onToggleVisibility("google")}
          placeholder="AIza…"
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || isUnchanged}
          className={primaryButtonClassName}
        >
          {isSaving && <InlineSpinner size="sm" />}
          {isSaving ? "Saving…" : "Save API keys"}
        </button>
      </div>
    </section>
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
        {label}
      </label>
      <div className="relative mt-1">
        <input
          type={isVisible ? "text" : "password"}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} pr-12`}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label={isVisible ? "Hide API key" : "Show API key"}
        >
          {isVisible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
