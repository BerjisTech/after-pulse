import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { validateOffer } from "../lib/utils/validators";
import { safeJsonParse, formatCurrency, formatCompact, formatPercentage, calcConversionRate } from "../lib/utils/formatting";
import {
  OFFER_TYPE_LABELS,
  DISCOUNT_TYPE_LABELS,
  PLACEMENT_LABELS,
  OFFER_STATUS_LABELS,
} from "../lib/utils/constants";
import styles from "../styles/offers.module.css";
import dashStyles from "../styles/dashboard.module.css";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const offerId = params.id;

  if (!offerId) {
    throw new Response("Offer ID is required", { status: 400 });
  }

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    throw new Response("Shop not found", { status: 404 });
  }

  const offer = await db.offer.findFirst({
    where: { id: offerId, shopId: shop.id },
  });

  if (!offer) {
    throw new Response("Offer not found", { status: 404 });
  }

  return { offer };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const offerId = params.id;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop || !offerId) {
    return { error: "Invalid request" };
  }

  if (intent === "delete") {
    await db.offer.delete({ where: { id: offerId } });
    return { success: true, redirect: "/app/offers" };
  }

  if (intent === "updateStatus") {
    const newStatus = formData.get("status") as string;
    await db.offer.update({
      where: { id: offerId },
      data: { status: newStatus },
    });
    return { success: true, statusUpdated: true };
  }

  // Update offer
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

  await db.offer.update({
    where: { id: offerId },
    data: {
      name: input.name,
      type: input.type,
      priority: input.priority || 0,
      productIds: input.productIds,
      discountType: input.discountType,
      discountValue: input.discountValue,
      headline: input.headline || "You might also like...",
      description: input.description || null,
      placement: input.placement || "thank_you",
      targetMinOrder: input.targetMinOrder,
      targetMaxOrder: input.targetMaxOrder,
      targetCountries: input.targetCountries,
      targetTags: input.targetTags,
    },
  });

  return { success: true, updated: true };
};

export default function EditOfferPage() {
  const { offer } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();

  const productIds = safeJsonParse<string[]>(offer.productIds, []);

  const [name, setName] = useState(offer.name);
  const [headline, setHeadline] = useState(offer.headline);
  const [description, setDescription] = useState(offer.description || "");
  const [placement, setPlacement] = useState(offer.placement);
  const [discountType, setDiscountType] = useState(offer.discountType || "");
  const [discountValue, setDiscountValue] = useState(
    offer.discountValue?.toString() || "",
  );
  const [selectedProducts, setSelectedProducts] = useState(
    productIds.map((id: string) => ({ id, title: id.split("/").pop() || "", imageUrl: "", price: "0.00" })),
  );
  const [targetMinOrder, setTargetMinOrder] = useState(
    offer.targetMinOrder?.toString() || "",
  );
  const [targetMaxOrder, setTargetMaxOrder] = useState(
    offer.targetMaxOrder?.toString() || "",
  );
  const [targetCountries, setTargetCountries] = useState(offer.targetCountries || "");
  const [targetTags, setTargetTags] = useState(offer.targetTags || "");
  const [priority, setPriority] = useState(offer.priority.toString());

  const isSubmitting = fetcher.state === "submitting";
  const errors = fetcher.data?.errors;

  useEffect(() => {
    if (fetcher.data?.redirect) {
      shopify.toast.show("Offer deleted");
      navigate(fetcher.data.redirect);
    } else if (fetcher.data?.updated) {
      shopify.toast.show("Offer updated");
    } else if (fetcher.data?.statusUpdated) {
      shopify.toast.show("Status updated");
    }
  }, [fetcher.data, shopify, navigate]);

  const handleProductPicker = async () => {
    try {
      const selection = await shopify.resourcePicker({
        type: "product",
        multiple: offer.type === "bundle",
        action: "select",
      });
      if (selection && selection.length > 0) {
        const products = selection.map((product: any) => ({
          id: product.id,
          title: product.title,
          imageUrl: product.images?.[0]?.originalSrc || "",
          price: product.variants?.[0]?.price || "0.00",
        }));
        setSelectedProducts(products);
      }
    } catch (e) {
      console.error("Product picker error:", e);
    }
  };

  const fieldError = (field: string) =>
    errors?.find((e: { field: string }) => e.field === field)?.message;

  return (
    <s-page heading={`Edit: ${offer.name}`}>
      {/* Performance Metrics */}
      <s-section heading="Performance">
        <div className={dashStyles["dashboard-grid"]}>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Impressions</div>
            <div className={dashStyles["metric-card__value"]}>
              {formatCompact(offer.impressions)}
            </div>
          </div>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Conversions</div>
            <div className={dashStyles["metric-card__value"]}>
              {formatCompact(offer.conversions)}
            </div>
          </div>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Revenue</div>
            <div className={dashStyles["metric-card__value"]}>
              {formatCurrency(offer.revenue)}
            </div>
          </div>
          <div className={dashStyles["metric-card"]}>
            <div className={dashStyles["metric-card__label"]}>Conv. Rate</div>
            <div className={dashStyles["metric-card__value"]}>
              {formatPercentage(calcConversionRate(offer.impressions, offer.conversions), false)}
            </div>
          </div>
        </div>
      </s-section>

      <fetcher.Form method="post">
        <input type="hidden" name="type" value={offer.type} />
        <input
          type="hidden"
          name="productIds"
          value={JSON.stringify(selectedProducts.map((p: any) => p.id))}
        />
        <input type="hidden" name="priority" value={priority} />

        {/* Offer Details */}
        <s-section heading="Offer Details">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="name"
              label="Offer Name"
              value={name}
              onChange={(e: any) => setName(e.currentTarget.value)}
              error={fieldError("name")}
            />
            <s-text-field
              name="headline"
              label="Headline"
              value={headline}
              onChange={(e: any) => setHeadline(e.currentTarget.value)}
              error={fieldError("headline")}
            />
            <s-text-field
              name="description"
              label="Description"
              value={description}
              onChange={(e: any) => setDescription(e.currentTarget.value)}
            />
          </s-stack>
        </s-section>

        {/* Products */}
        <s-section heading="Products">
          <s-stack direction="block" gap="base">
            <s-button onClick={handleProductPicker}>Change Products</s-button>
            {selectedProducts.length > 0 && (
              <div className={styles["product-list"]}>
                {selectedProducts.map((product: any) => (
                  <div key={product.id} className={styles["product-item"]}>
                    <div className={styles["product-item__info"]}>
                      <div className={styles["product-item__title"]}>
                        {product.title || product.id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </s-stack>
        </s-section>

        {/* Discount */}
        <s-section heading="Discount">
          <s-stack direction="block" gap="base">
            <s-select
              name="discountType"
              label="Discount Type"
              value={discountType}
              onChange={(e: any) => setDiscountType(e.currentTarget.value)}
            >
              <s-option value="">No discount</s-option>
              <s-option value="percentage">Percentage Off</s-option>
              <s-option value="fixed">Fixed Amount Off</s-option>
              <s-option value="free_shipping">Free Shipping</s-option>
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
            <s-option value="thank_you">Thank You Page</s-option>
            <s-option value="order_status">Order Status Page</s-option>
            <s-option value="post_purchase">Post-Purchase (Shopify Plus)</s-option>
          </s-select>
        </s-section>

        {/* Targeting */}
        <s-section heading="Targeting Rules">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="targetMinOrder"
              label="Minimum Order Value ($)"
              inputmode="numeric"
              value={targetMinOrder}
              onChange={(e: any) => setTargetMinOrder(e.currentTarget.value)}
            />
            <s-text-field
              name="targetMaxOrder"
              label="Maximum Order Value ($)"
              inputmode="numeric"
              value={targetMaxOrder}
              onChange={(e: any) => setTargetMaxOrder(e.currentTarget.value)}
            />
            <s-text-field
              name="targetTags"
              label="Customer Tags"
              value={targetTags}
              onChange={(e: any) => setTargetTags(e.currentTarget.value)}
              details="Comma-separated"
            />
            <s-text-field
              name="targetCountries"
              label="Countries"
              value={targetCountries}
              onChange={(e: any) => setTargetCountries(e.currentTarget.value)}
              details="Comma-separated country codes"
            />
          </s-stack>
        </s-section>

        {/* Save */}
        <s-section>
          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              type="submit"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Save Changes
            </s-button>
            <s-button variant="tertiary" href="/app/offers">
              Cancel
            </s-button>
          </s-stack>
        </s-section>
      </fetcher.Form>

      {/* Sidebar: Status & Danger Zone */}
      <s-section slot="aside" heading="Status">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Current status:{" "}
            <span
              className={`${dashStyles["status-badge"]} ${
                dashStyles[`status-badge--${offer.status}`]
              }`}
            >
              {OFFER_STATUS_LABELS[offer.status]}
            </span>
          </s-paragraph>
          {offer.status === "draft" && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="updateStatus" />
              <input type="hidden" name="status" value="active" />
              <s-button type="submit" variant="primary">
                Activate Offer
              </s-button>
            </fetcher.Form>
          )}
          {offer.status === "active" && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="updateStatus" />
              <input type="hidden" name="status" value="paused" />
              <s-button type="submit">Pause Offer</s-button>
            </fetcher.Form>
          )}
          {offer.status === "paused" && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="updateStatus" />
              <input type="hidden" name="status" value="active" />
              <s-button type="submit" variant="primary">
                Resume Offer
              </s-button>
            </fetcher.Form>
          )}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Danger Zone">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <s-button type="submit" tone="critical" variant="primary">
            Delete Offer
          </s-button>
        </fetcher.Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
