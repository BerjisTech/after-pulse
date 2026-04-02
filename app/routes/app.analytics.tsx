import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getAnalyticsOverview } from "../lib/analytics/aggregator.server";
import {
  formatCurrency,
  formatCompact,
  formatPercentage,
} from "../lib/utils/formatting";
import { PLACEMENT_LABELS } from "../lib/utils/constants";
import dashStyles from "../styles/dashboard.module.css";
import styles from "../styles/analytics.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const dateRange = url.searchParams.get("range") || "last_30";

  const shop = await db.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { overview: null, dateRange };
  }

  const overview = await getAnalyticsOverview(shop.id, dateRange);
  return { overview, dateRange };
};

export default function AnalyticsPage() {
  const { overview, dateRange } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Analytics">
      {/* Date Range */}
      <s-section>
        <s-stack direction="inline" gap="base">
          {[
            { value: "today", label: "Today" },
            { value: "last_7", label: "7 days" },
            { value: "last_30", label: "30 days" },
            { value: "last_90", label: "90 days" },
          ].map((range) => (
            <s-button
              key={range.value}
              variant={dateRange === range.value ? "primary" : "tertiary"}
              href={`/app/analytics?range=${range.value}`}
            >
              {range.label}
            </s-button>
          ))}
        </s-stack>
      </s-section>

      {overview ? (
        <>
          {/* Overview Metrics */}
          <s-section heading="Overview">
            <div className={styles["analytics-metrics"]}>
              <div className={dashStyles["metric-card"]}>
                <div className={dashStyles["metric-card__label"]}>Total Revenue</div>
                <div className={dashStyles["metric-card__value"]}>
                  {formatCurrency(overview.totalRevenue)}
                </div>
              </div>
              <div className={dashStyles["metric-card"]}>
                <div className={dashStyles["metric-card__label"]}>Impressions</div>
                <div className={dashStyles["metric-card__value"]}>
                  {formatCompact(overview.totalImpressions)}
                </div>
              </div>
              <div className={dashStyles["metric-card"]}>
                <div className={dashStyles["metric-card__label"]}>Conversions</div>
                <div className={dashStyles["metric-card__value"]}>
                  {formatCompact(overview.totalConversions)}
                </div>
              </div>
              <div className={dashStyles["metric-card"]}>
                <div className={dashStyles["metric-card__label"]}>Conversion Rate</div>
                <div className={dashStyles["metric-card__value"]}>
                  {formatPercentage(overview.conversionRate, false)}
                </div>
              </div>
            </div>
          </s-section>

          {/* Additional Metrics */}
          <s-section heading="Detailed Metrics">
            <div className={dashStyles["dashboard-grid"]}>
              <div className={dashStyles["metric-card"]}>
                <div className={dashStyles["metric-card__label"]}>Click-Through Rate</div>
                <div className={dashStyles["metric-card__value"]}>
                  {formatPercentage(overview.clickThroughRate, false)}
                </div>
              </div>
              <div className={dashStyles["metric-card"]}>
                <div className={dashStyles["metric-card__label"]}>Total Clicks</div>
                <div className={dashStyles["metric-card__value"]}>
                  {formatCompact(overview.totalClicks)}
                </div>
              </div>
              <div className={dashStyles["metric-card"]}>
                <div className={dashStyles["metric-card__label"]}>Avg Revenue / Conversion</div>
                <div className={dashStyles["metric-card__value"]}>
                  {formatCurrency(overview.averageRevenuePerConversion)}
                </div>
              </div>
            </div>
          </s-section>

          {/* Revenue by Placement */}
          <s-section heading="Revenue by Placement">
            <div className={styles["placement-grid"]}>
              {Object.entries(overview.revenueByPlacement).map(([placement, revenue]) => (
                <div key={placement} className={styles["placement-card"]}>
                  <div className={styles["placement-card__label"]}>
                    {PLACEMENT_LABELS[placement] || placement}
                  </div>
                  <div className={styles["placement-card__value"]}>
                    {formatCurrency(revenue as number)}
                  </div>
                </div>
              ))}
            </div>
          </s-section>

          {/* Revenue Chart */}
          <s-section heading="Revenue Trend">
            <div className={dashStyles["chart-container"]}>
              {overview.revenueByDay.length > 0 ? (
                <RevenueChart data={overview.revenueByDay} />
              ) : (
                <div className={dashStyles["empty-state"]}>
                  <div className={dashStyles["empty-state__icon"]}>📊</div>
                  <div className={dashStyles["empty-state__title"]}>No data yet</div>
                  <div className={dashStyles["empty-state__description"]}>
                    Revenue data will appear here once conversions start coming in.
                  </div>
                </div>
              )}
            </div>
          </s-section>

          {/* Top Offers */}
          <s-section heading="Top Performing Offers">
            {overview.topOffers.length > 0 ? (
              <div className={dashStyles["top-offers"]}>
                <table className={dashStyles["top-offers__table"]}>
                  <thead>
                    <tr>
                      <th>Offer</th>
                      <th>Impressions</th>
                      <th>Conversions</th>
                      <th>Revenue</th>
                      <th>Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.topOffers.map((offer) => (
                      <tr key={offer.id}>
                        <td style={{ fontWeight: 600 }}>{offer.name}</td>
                        <td>{formatCompact(offer.impressions)}</td>
                        <td>{formatCompact(offer.conversions)}</td>
                        <td>{formatCurrency(offer.revenue)}</td>
                        <td>{formatPercentage(offer.conversionRate, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={dashStyles["empty-state"]}>
                <div className={dashStyles["empty-state__icon"]}>🎯</div>
                <div className={dashStyles["empty-state__title"]}>No offer data yet</div>
                <div className={dashStyles["empty-state__description"]}>
                  Offer performance will show here once active offers receive impressions.
                </div>
              </div>
            )}
          </s-section>
        </>
      ) : (
        <s-section>
          <div className={dashStyles["empty-state"]}>
            <div className={dashStyles["empty-state__icon"]}>📊</div>
            <div className={dashStyles["empty-state__title"]}>No analytics data</div>
            <div className={dashStyles["empty-state__description"]}>
              Analytics will appear here once your offers start receiving traffic.
              Create and activate an offer to get started.
            </div>
            <s-button href="/app/offers/new">Create an Offer</s-button>
          </div>
        </s-section>
      )}
    </s-page>
  );
}

// ─── Inline SVG Revenue Chart ───
function RevenueChart({
  data,
}: {
  data: Array<{ date: string; revenue: number; conversions: number }>;
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - (d.revenue / maxRevenue) * chartHeight,
    revenue: d.revenue,
    date: d.date,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    padding.top + chartHeight
  } L ${padding.left} ${padding.top + chartHeight} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padding.top + chartHeight - frac * chartHeight;
        return (
          <g key={frac}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              ${Math.round(maxRevenue * frac)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#analyticsGradient)" />
      <path d={linePath} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4F46E5" stroke="white" strokeWidth="1.5" />
      ))}
      {points
        .filter((_, i) => i % Math.max(Math.floor(points.length / 6), 1) === 0)
        .map((p, i) => (
          <text key={i} x={p.x} y={height - 5} textAnchor="middle" fontSize="10" fill="#94a3b8">
            {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
    </svg>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
