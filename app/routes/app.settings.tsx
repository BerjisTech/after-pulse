import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { validateSettings } from "../lib/utils/validators";
import { AI_PROVIDER_LABELS } from "../lib/utils/constants";
import styles from "../styles/analytics.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  let shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    shop = await db.shop.create({
      data: { shopDomain: session.shop },
    });
  }

  // Mask the API key for display
  const maskedApiKey = shop.aiApiKey
    ? `${shop.aiApiKey.slice(0, 8)}${"*".repeat(20)}${shop.aiApiKey.slice(-4)}`
    : "";

  return {
    settings: {
      ...shop,
      aiApiKey: maskedApiKey,
    },
    hasApiKey: !!shop.aiApiKey,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { error: "Shop not found" };
  }

  if (intent === "updateGeneral") {
    const enablePostPurchase = formData.get("enablePostPurchase") === "true";
    const enableThankYou = formData.get("enableThankYou") === "true";
    const enableAi = formData.get("enableAi") === "true";

    await db.shop.update({
      where: { id: shop.id },
      data: { enablePostPurchase, enableThankYou, enableAi },
    });

    return { success: true, section: "general" };
  }

  if (intent === "updateAi") {
    const aiProvider = formData.get("aiProvider") as string;
    const aiApiKey = formData.get("aiApiKey") as string;

    const validation = validateSettings({ aiProvider, aiApiKey });
    if (!validation.valid) {
      return { errors: validation.errors };
    }

    const updateData: Record<string, string> = { aiProvider };
    // Only update the key if it's not the masked version
    if (aiApiKey && !aiApiKey.includes("*")) {
      updateData.aiApiKey = aiApiKey;
    }

    await db.shop.update({
      where: { id: shop.id },
      data: updateData,
    });

    return { success: true, section: "ai" };
  }

  if (intent === "updateStyling") {
    const brandColor = formData.get("brandColor") as string;
    const accentColor = formData.get("accentColor") as string;

    const validation = validateSettings({ brandColor, accentColor });
    if (!validation.valid) {
      return { errors: validation.errors };
    }

    await db.shop.update({
      where: { id: shop.id },
      data: { brandColor, accentColor },
    });

    return { success: true, section: "styling" };
  }

  return { error: "Unknown action" };
};

export default function SettingsPage() {
  const { settings, hasApiKey } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const fetcher = useFetcher<typeof action>();

  const [enablePostPurchase, setEnablePostPurchase] = useState(settings.enablePostPurchase);
  const [enableThankYou, setEnableThankYou] = useState(settings.enableThankYou);
  const [enableAi, setEnableAi] = useState(settings.enableAi);
  const [aiProvider, setAiProvider] = useState(settings.aiProvider);
  const [aiApiKey, setAiApiKey] = useState(settings.aiApiKey || "");
  const [brandColor, setBrandColor] = useState(settings.brandColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved!");
    }
  }, [fetcher.data, shopify]);

  const isSubmitting = fetcher.state === "submitting";

  return (
    <s-page heading="Settings">
      {/* General Settings */}
      <s-section heading="General">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="updateGeneral" />
          <s-stack direction="block" gap="base">
            <div className={styles["toggle-row"]}>
              <div>
                <div className={styles["toggle-row__label"]}>Post-Purchase Offers</div>
                <div className={styles["toggle-row__description"]}>
                  Show upsell offers between checkout and thank you page (Shopify Plus)
                </div>
              </div>
              <s-checkbox
                name="enablePostPurchase"
                value="true"
                checked={enablePostPurchase || undefined}
                onChange={(e: any) => setEnablePostPurchase(e.currentTarget.checked)}
              />
            </div>
            <div className={styles["toggle-row"]}>
              <div>
                <div className={styles["toggle-row__label"]}>Thank You Page Offers</div>
                <div className={styles["toggle-row__description"]}>
                  Show upsell offers on the Thank You and Order Status pages
                </div>
              </div>
              <s-checkbox
                name="enableThankYou"
                value="true"
                checked={enableThankYou || undefined}
                onChange={(e: any) => setEnableThankYou(e.currentTarget.checked)}
              />
            </div>
            <div className={styles["toggle-row"]}>
              <div>
                <div className={styles["toggle-row__label"]}>AI-Powered Recommendations</div>
                <div className={styles["toggle-row__description"]}>
                  Use AI to generate personalized offer suggestions
                </div>
              </div>
              <s-checkbox
                name="enableAi"
                value="true"
                checked={enableAi || undefined}
                onChange={(e: any) => setEnableAi(e.currentTarget.checked)}
              />
            </div>
            <s-button
              type="submit"
              variant="primary"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Save General Settings
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>

      {/* AI Configuration */}
      <s-section heading="AI Configuration">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="updateAi" />
          <s-stack direction="block" gap="base">
            <div
              className={`${styles["ai-config-status"]} ${
                hasApiKey
                  ? styles["ai-config-status--connected"]
                  : styles["ai-config-status--disconnected"]
              }`}
            >
              {hasApiKey ? "✓ AI provider connected" : "✗ No API key configured"}
            </div>
            <s-select
              name="aiProvider"
              label="AI Provider"
              value={aiProvider}
              onChange={(e: any) => setAiProvider(e.currentTarget.value)}
            >
              <s-option value="openai">OpenAI (GPT-4)</s-option>
              <s-option value="claude">Anthropic (Claude)</s-option>
              <s-option value="gemini">Google (Gemini)</s-option>
            </s-select>
            <s-text-field
              name="aiApiKey"
              label="API Key"
              value={aiApiKey}
              onChange={(e: any) => setAiApiKey(e.currentTarget.value)}
              details={
                aiProvider === "openai"
                  ? "Enter your OpenAI API key (starts with sk-)"
                  : aiProvider === "claude"
                    ? "Enter your Anthropic API key (starts with sk-ant-)"
                    : "Enter your Google AI API key"
              }
            />
            <s-button
              type="submit"
              variant="primary"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Save AI Settings
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>

      {/* API Key Guide */}
      <s-section heading="Where to Get API Keys">
        <s-stack direction="block" gap="base">
          <div className={styles["settings-section"]}>
            <div className={styles["settings-section__title"]}>🤖 OpenAI (GPT-4)</div>
            <s-stack direction="block" gap="tight">
              <s-paragraph>
                OpenAI powers intelligent product recommendations using GPT-4.
              </s-paragraph>
              <s-ordered-list>
                <s-list-item>
                  Go to{" "}
                  <s-link href="https://platform.openai.com/signup" target="_blank">
                    platform.openai.com
                  </s-link>
                </s-list-item>
                <s-list-item>Sign up or log in to your account</s-list-item>
                <s-list-item>
                  Navigate to{" "}
                  <s-link href="https://platform.openai.com/api-keys" target="_blank">
                    API Keys
                  </s-link>
                </s-list-item>
                <s-list-item>Click "Create new secret key" and copy it</s-list-item>
                <s-list-item>Paste it above in the API Key field</s-list-item>
              </s-ordered-list>
              <s-paragraph>
                <s-text appearance="subdued" size="small">
                  Typical cost: ~$0.01–0.05 per AI suggestion generation
                </s-text>
              </s-paragraph>
            </s-stack>
          </div>

          <div className={styles["settings-section"]}>
            <div className={styles["settings-section__title"]}>🧠 Anthropic (Claude)</div>
            <s-stack direction="block" gap="tight">
              <s-paragraph>
                Claude excels at nuanced, context-aware product recommendations.
              </s-paragraph>
              <s-ordered-list>
                <s-list-item>
                  Go to{" "}
                  <s-link href="https://console.anthropic.com/" target="_blank">
                    console.anthropic.com
                  </s-link>
                </s-list-item>
                <s-list-item>Sign up or log in to your account</s-list-item>
                <s-list-item>
                  Navigate to{" "}
                  <s-link href="https://console.anthropic.com/settings/keys" target="_blank">
                    API Keys
                  </s-link>
                </s-list-item>
                <s-list-item>Click "Create Key" and copy it</s-list-item>
                <s-list-item>Paste it above in the API Key field</s-list-item>
              </s-ordered-list>
              <s-paragraph>
                <s-text appearance="subdued" size="small">
                  Typical cost: ~$0.01–0.04 per AI suggestion generation
                </s-text>
              </s-paragraph>
            </s-stack>
          </div>

          <div className={styles["settings-section"]}>
            <div className={styles["settings-section__title"]}>✨ Google (Gemini)</div>
            <s-stack direction="block" gap="tight">
              <s-paragraph>
                Gemini 2.0 Flash offers fast, cost-effective AI recommendations.
              </s-paragraph>
              <s-ordered-list>
                <s-list-item>
                  Go to{" "}
                  <s-link href="https://aistudio.google.com/apikey" target="_blank">
                    Google AI Studio
                  </s-link>
                </s-list-item>
                <s-list-item>Sign in with your Google account</s-list-item>
                <s-list-item>Click "Create API key"</s-list-item>
                <s-list-item>Copy the generated key</s-list-item>
                <s-list-item>Paste it above in the API Key field</s-list-item>
              </s-ordered-list>
              <s-paragraph>
                <s-text appearance="subdued" size="small">
                  Typical cost: Free tier available, ~$0.001 per suggestion after
                </s-text>
              </s-paragraph>
            </s-stack>
          </div>
        </s-stack>
      </s-section>

      {/* Styling */}
      <s-section heading="Branding & Styling">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="updateStyling" />
          <s-stack direction="block" gap="base">
            <div className={styles["color-picker"]}>
              <input
                type="color"
                name="brandColor"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className={styles["color-picker__swatch"]}
              />
              <div>
                <div className={styles["color-picker__label"]}>Brand Color</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {brandColor}
                </div>
              </div>
            </div>
            <div className={styles["color-picker"]}>
              <input
                type="color"
                name="accentColor"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className={styles["color-picker__swatch"]}
              />
              <div>
                <div className={styles["color-picker__label"]}>Accent Color</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {accentColor}
                </div>
              </div>
            </div>
            <s-button
              type="submit"
              variant="primary"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Save Branding
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>

      {/* Sidebar Info */}
      <s-section slot="aside" heading="About AfterPulse">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text fontWeight="bold">AfterPulse</s-text> helps you increase Average Order
            Value with smart post-purchase upsells powered by AI.
          </s-paragraph>
          <s-paragraph>
            <s-text>Version: </s-text>
            <s-text fontWeight="semibold">1.0.0 (MVP)</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text>Shop: </s-text>
            <s-text fontWeight="semibold">{settings.shopDomain}</s-text>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Need Help?">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text appearance="subdued">
              Having trouble setting up AI or configuring offers? We're here to help.
            </s-text>
          </s-paragraph>
          <s-button href="mailto:support@berjisapps.com" variant="primary">
            📧 Contact Support
          </s-button>
          <s-unordered-list>
            <s-list-item>
              <s-link href="https://shopify.dev/docs/apps" target="_blank">
                Shopify App Documentation
              </s-link>
            </s-list-item>
            <s-list-item>
              <s-link href="https://shopify.dev/docs/api/checkout-extensions" target="_blank">
                Checkout Extensions Guide
              </s-link>
            </s-list-item>
          </s-unordered-list>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
