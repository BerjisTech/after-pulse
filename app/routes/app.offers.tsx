import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import {
  formatCurrency,
  formatCompact,
  formatPercentage,
  calcConversionRate,
} from "../lib/utils/formatting";
import {
  OFFER_TYPE_LABELS,
  OFFER_STATUS_LABELS,
} from "../lib/utils/constants";
import styles from "../styles/offers.module.css";
import dashStyles from "../styles/dashboard.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("q") || "";

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { offers: [], total: 0, status, search };
  }

  const where: Record<string, unknown> = { shopId: shop.id };
  if (status !== "all") {
    where.status = status;
  }
  if (search) {
    where.name = { contains: search };
  }

  const [offers, total] = await Promise.all([
    db.offer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    db.offer.count({ where }),
  ]);

  return { offers, total, status, search };
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

  if (intent === "delete") {
    const offerId = formData.get("offerId") as string;
    await db.offer.delete({ where: { id: offerId } });
    return { success: true };
  }

  if (intent === "updateStatus") {
    const offerId = formData.get("offerId") as string;
    const newStatus = formData.get("status") as string;
    await db.offer.update({
      where: { id: offerId },
      data: { status: newStatus },
    });
    return { success: true };
  }

  return { error: "Unknown action" };
};

export default function OffersPage() {
  const { offers, total, status, search } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Drafts" },
    { value: "paused", label: "Paused" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <s-page heading="Offers">
      <s-button slot="primary-action" href="/app/offers/new">
        Create Offer
      </s-button>

      <s-section>
        {/* Filters */}
        <div className={styles["offers-filters"]}>
          <s-stack direction="inline" gap="base">
            {statusOptions.map((opt) => (
              <s-button
                key={opt.value}
                variant={status === opt.value ? "primary" : "tertiary"}
                href={`/app/offers?status=${opt.value}${search ? `&q=${search}` : ""}`}
              >
                {opt.label}
              </s-button>
            ))}
          </s-stack>
        </div>

        {/* Offers Table */}
        {offers.length > 0 ? (
          <>
            <s-paragraph>
              <s-text>
                Showing {offers.length} of {total} offers
              </s-text>
            </s-paragraph>
            <table className={styles["offers-table"]}>
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Impressions</th>
                  <th>Conversions</th>
                  <th>Revenue</th>
                  <th>Conv. Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <Link
                        to={`/app/offers/${offer.id}`}
                        style={{ fontWeight: 600, color: "inherit", textDecoration: "none" }}
                      >
                        {offer.name}
                      </Link>
                    </td>
                    <td>
                      <span className={styles["offers-table__type"]}>
                        {offer.type === "single" ? "📦" : offer.type === "bundle" ? "🎁" : "🏷️"}{" "}
                        {OFFER_TYPE_LABELS[offer.type] || offer.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${dashStyles["status-badge"]} ${
                          dashStyles[`status-badge--${offer.status}`]
                        }`}
                      >
                        {OFFER_STATUS_LABELS[offer.status] || offer.status}
                      </span>
                    </td>
                    <td>{formatCompact(offer.impressions)}</td>
                    <td>{formatCompact(offer.conversions)}</td>
                    <td>{formatCurrency(offer.revenue)}</td>
                    <td>
                      {formatPercentage(
                        calcConversionRate(offer.impressions, offer.conversions),
                        false,
                      )}
                    </td>
                    <td>
                      <s-stack direction="inline" gap="tight">
                        {offer.status === "draft" && (
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="updateStatus" />
                            <input type="hidden" name="offerId" value={offer.id} />
                            <input type="hidden" name="status" value="active" />
                            <s-button variant="primary" type="submit" size="slim">
                              Activate
                            </s-button>
                          </fetcher.Form>
                        )}
                        {offer.status === "active" && (
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="updateStatus" />
                            <input type="hidden" name="offerId" value={offer.id} />
                            <input type="hidden" name="status" value="paused" />
                            <s-button variant="tertiary" type="submit" size="slim">
                              Pause
                            </s-button>
                          </fetcher.Form>
                        )}
                        {offer.status === "paused" && (
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="updateStatus" />
                            <input type="hidden" name="offerId" value={offer.id} />
                            <input type="hidden" name="status" value="active" />
                            <s-button variant="primary" type="submit" size="slim">
                              Resume
                            </s-button>
                          </fetcher.Form>
                        )}
                        <s-button variant="tertiary" href={`/app/offers/${offer.id}`} size="slim">
                          Edit
                        </s-button>
                      </s-stack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className={dashStyles["empty-state"]}>
            <div className={dashStyles["empty-state__icon"]}>🎯</div>
            <div className={dashStyles["empty-state__title"]}>No offers found</div>
            <div className={dashStyles["empty-state__description"]}>
              {status !== "all"
                ? `You don't have any ${status} offers. Try a different filter or create a new one.`
                : "Create your first upsell offer to increase your average order value."}
            </div>
            <s-button href="/app/offers/new">Create Your First Offer</s-button>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
