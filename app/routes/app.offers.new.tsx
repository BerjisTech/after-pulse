import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { validateOffer } from "../lib/utils/validators";
import {
  OFFER_TYPE_LABELS,
  DISCOUNT_TYPE_LABELS,
  PLACEMENT_LABELS,
  DEFAULT_HEADLINES,
} from "../lib/utils/constants";
import styles from "../styles/offers.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { error: "Shop not found. Please refresh the page." };
  }

  const input = {
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    productIds: formData.get("productIds") as string,
    discountType: (formData.get("discountType") as string) || null,
    discountValue: formData.get("discountValue")
      ? parseFloat(formData.get("discountValue") as string)
      : null,
    headline: (formData.get("headline") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    placement: (formData.get("placement") as string) || "thank_you",
    targetMinOrder: formData.get("targetMinOrder")
      ? parseFloat(formData.get("targetMinOrder") as string)
      : null,
    targetMaxOrder: formData.get("targetMaxOrder")
      ? parseFloat(formData.get("targetMaxOrder") as string)
      : null,
    targetCountries: (formData.get("targetCountries") as string) || null,
    targetTags: (formData.get("targetTags") as string) || null,
    priority: formData.get("priority")
      ? parseInt(formData.get("priority") as string, 10)
      : 0,
  };

  const validation = validateOffer(input);
  if (!validation.valid) {
    return { errors: validation.errors };
  }

  const status = (formData.get("saveAs") as string) === "active" ? "active" : "draft";

  const offer = await db.offer.create({
    data: {
      shopId: shop.id,
      name: input.name,
      type: input.type,
      status,
      priority: input.priority || 0,
      productIds: input.productIds,
      discountType: input.discountType,
      discountValue: input.discountValue,
      headline: input.headline || DEFAULT_HEADLINES[input.type] || "You might also like...",
      description: input.description || null,
      placement: input.placement || "thank_you",
      targetMinOrder: input.targetMinOrder,
      targetMaxOrder: input.targetMaxOrder,
      targetCountries: input.targetCountries,
      targetTags: input.targetTags,
    },
  });

  return { success: true, offerId: offer.id, redirect: "/app/offers" };
};

export default function NewOfferPage() {
  const shopify = useAppBridge();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();

  const [offerType, setOfferType] = useState<string>("single");
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [placement, setPlacement] = useState("thank_you");
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<
    Array<{ id: string; title: string; imageUrl: string; price: string }>
  >([]);
  const [targetMinOrder, setTargetMinOrder] = useState("");
  const [targetMaxOrder, setTargetMaxOrder] = useState("");
  const [targetCountries, setTargetCountries] = useState("");
  const [targetTags, setTargetTags] = useState("");
  const [priority, setPriority] = useState("0");

  const isSubmitting = fetcher.state === "submitting";
  const errors = fetcher.data?.errors;

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Offer created successfully!");
      navigate("/app/offers");
    }
  }, [fetcher.data, shopify, navigate]);

  // Update headline when type changes
  useEffect(() => {
    if (!headline || Object.values(DEFAULT_HEADLINES).includes(headline)) {
      setHeadline(DEFAULT_HEADLINES[offerType] || "You might also like...");
    }
  }, [offerType]);

  const handleProductPicker = async () => {
    try {
      const selection = await shopify.resourcePicker({
        type: "product",
        multiple: offerType === "bundle",
        action: "select",
      });
      if (selection && selection.length > 0) {
        const products = selection.map((product: any) => ({
          id: product.id,
          title: product.title,
          imageUrl: product.images?.[0]?.originalSrc || "",
          price: product.variants?.[0]?.price || "0.00",
        }));
        setSelectedProducts((prev) =>
          offerType === "bundle" ? [...prev, ...products] : products,
        );
      }
    } catch (e) {
      console.error("Product picker error:", e);
    }
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const fieldError = (field: string) =>
    errors?.find((e: { field: string }) => e.field === field)?.message;

  return (
    <s-page heading="Create New Offer">
      <fetcher.Form method="post">
        {/* Hidden fields for form data */}
        <input type="hidden" name="type" value={offerType} />
        <input
          type="hidden"
          name="productIds"
          value={JSON.stringify(selectedProducts.map((p) => p.id))}
        />
        <input type="hidden" name="priority" value={priority} />

        {/* Offer Type Selection */}
        <s-section heading="Offer Type">
          <div className={styles["offer-types"]}>
            {[
              { type: "single", icon: "📦", desc: "Recommend a single product" },
              { type: "bundle", icon: "🎁", desc: "Create a product bundle" },
              { type: "discount", icon: "🏷️", desc: "Offer a discount incentive" },
            ].map((opt) => (
              <div
                key={opt.type}
                className={`${styles["offer-type-card"]} ${
                  offerType === opt.type ? styles["offer-type-card--selected"] : ""
                }`}
                onClick={() => setOfferType(opt.type)}
                role="button"
                tabIndex={0}
              >
                <div className={styles["offer-type-card__icon"]}>{opt.icon}</div>
                <div className={styles["offer-type-card__title"]}>
                  {OFFER_TYPE_LABELS[opt.type]}
                </div>
                <div className={styles["offer-type-card__description"]}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </s-section>

        {/* Basic Details */}
        <s-section heading="Offer Details">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="name"
              label="Offer Name"
              value={name}
              onChange={(e: any) => setName(e.currentTarget.value)}
              error={fieldError("name")}
              details="Internal name for this offer"
            />
            <s-text-field
              name="headline"
              label="Headline"
              value={headline}
              onChange={(e: any) => setHeadline(e.currentTarget.value)}
              error={fieldError("headline")}
              details="Shown to customers above the offer"
            />
            <s-text-field
              name="description"
              label="Description (optional)"
              value={description}
              onChange={(e: any) => setDescription(e.currentTarget.value)}
              details="Additional text shown below the headline"
            />
          </s-stack>
        </s-section>

        {/* Products */}
        <s-section heading="Products">
          <s-stack direction="block" gap="base">
            <s-button onClick={handleProductPicker}>
              {selectedProducts.length > 0 ? "Change Products" : "Select Products"}
            </s-button>
            {fieldError("productIds") && (
              <s-text tone="critical">{fieldError("productIds")}</s-text>
            )}
            {selectedProducts.length > 0 && (
              <div className={styles["product-list"]}>
                {selectedProducts.map((product) => (
                  <div key={product.id} className={styles["product-item"]}>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className={styles["product-item__image"]}
                      />
                    ) : (
                      <div className={styles["product-item__image"]} />
                    )}
                    <div className={styles["product-item__info"]}>
                      <div className={styles["product-item__title"]}>{product.title}</div>
                      <div className={styles["product-item__price"]}>${product.price}</div>
                    </div>
                    <div
                      className={styles["product-item__remove"]}
                      onClick={() => removeProduct(product.id)}
                      role="button"
                      tabIndex={0}
                    >
                      ✕
                    </div>
                  </div>
                ))}
              </div>
            )}
          </s-stack>
        </s-section>

        {/* Discount */}
        <s-section heading="Discount (Optional)">
          <s-stack direction="block" gap="base">
            <s-select
              name="discountType"
              label="Discount Type"
              value={discountType}
              onChange={(e: any) => setDiscountType(e.currentTarget.value)}
            >
              <option value="">No discount</option>
              {Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </s-select>
            {discountType && discountType !== "free_shipping" && (
              <s-text-field
                name="discountValue"
                label={discountType === "percentage" ? "Discount %" : "Discount Amount ($)"}
                inputmode="numeric"
                value={discountValue}
                onChange={(e: any) => setDiscountValue(e.currentTarget.value)}
                error={fieldError("discountValue")}
              />
            )}
          </s-stack>
        </s-section>

        {/* Placement */}
        <s-section heading="Placement">
          <s-select
            name="placement"
            label="Where to show this offer"
            value={placement}
            onChange={(e: any) => setPlacement(e.currentTarget.value)}
          >
            {Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </s-select>
        </s-section>

        {/* Targeting */}
        <s-section heading="Targeting Rules (Optional)">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="targetMinOrder"
              label="Minimum Order Value ($)"
              inputmode="numeric"
              value={targetMinOrder}
              onChange={(e: any) => setTargetMinOrder(e.currentTarget.value)}
              error={fieldError("targetMinOrder")}
              details="Only show this offer if order value is above this amount"
            />
            <s-text-field
              name="targetMaxOrder"
              label="Maximum Order Value ($)"
              inputmode="numeric"
              value={targetMaxOrder}
              onChange={(e: any) => setTargetMaxOrder(e.currentTarget.value)}
              details="Only show if order value is below this amount"
            />
            <s-text-field
              name="targetTags"
              label="Customer Tags"
              value={targetTags}
              onChange={(e: any) => setTargetTags(e.currentTarget.value)}
              details="Comma-separated list of customer tags (e.g., VIP, returning)"
            />
            <s-text-field
              name="targetCountries"
              label="Countries"
              value={targetCountries}
              onChange={(e: any) => setTargetCountries(e.currentTarget.value)}
              details="Comma-separated country codes (e.g., US, CA, GB)"
            />
          </s-stack>
        </s-section>

        {/* Priority */}
        <s-section heading="Priority">
          <s-text-field
            label="Offer Priority"
            inputmode="numeric"
            value={priority}
            onChange={(e: any) => setPriority(e.currentTarget.value)}
            details="Higher priority offers are shown first (0 = default)"
          />
        </s-section>

        {/* Actions */}
        <s-section>
          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              type="submit"
              name="saveAs"
              value="draft"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Save as Draft
            </s-button>
            <s-button
              type="submit"
              name="saveAs"
              value="active"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Save & Activate
            </s-button>
            <s-button variant="tertiary" href="/app/offers">
              Cancel
            </s-button>
          </s-stack>
        </s-section>
      </fetcher.Form>

      {/* Live Preview Sidebar */}
      <s-section slot="aside" heading="Preview">
        <div className={styles["offer-preview"]}>
          <div className={styles["offer-preview__badge"]}>
            {OFFER_TYPE_LABELS[offerType] || "Offer"}
          </div>
          <div className={styles["offer-preview__headline"]}>
            {headline || "You might also like..."}
          </div>
          {description && (
            <div className={styles["offer-preview__description"]}>{description}</div>
          )}
          {selectedProducts.length > 0 ? (
            selectedProducts.map((product) => (
              <div key={product.id} className={styles["offer-preview__product"]}>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className={styles["offer-preview__product-image"]}
                  />
                ) : (
                  <div className={styles["offer-preview__product-image"]} />
                )}
                <div>
                  <div className={styles["offer-preview__product-title"]}>
                    {product.title}
                  </div>
                  <div className={styles["offer-preview__product-price"]}>
                    {discountType && discountValue ? (
                      <>
                        <span className={styles["offer-preview__product-price--original"]}>
                          ${product.price}
                        </span>
                        <span className={styles["offer-preview__product-price--discounted"]}>
                          $
                          {discountType === "percentage"
                            ? (
                                parseFloat(product.price) *
                                (1 - parseFloat(discountValue) / 100)
                              ).toFixed(2)
                            : Math.max(
                                parseFloat(product.price) - parseFloat(discountValue),
                                0,
                              ).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span>${product.price}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "0.875rem",
              }}
            >
              Select products to see a preview
            </div>
          )}
          <button className={styles["offer-preview__cta"]} type="button">
            Add to Order
          </button>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
