// ─── Analytics Aggregation Utilities ───

import db from "../../db.server";
import type {
  DashboardMetrics,
  DailyRevenue,
  TopOffer,
  AnalyticsOverview,
  Placement,
} from "../offers/types";
import { calcConversionRate } from "../utils/formatting";

/**
 * Get a date N days ago (at midnight).
 */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the start date for a date range key.
 */
export function getDateRangeStart(range: string): Date {
  switch (range) {
    case "today":
      return daysAgo(0);
    case "last_7":
      return daysAgo(7);
    case "last_30":
      return daysAgo(30);
    case "last_90":
      return daysAgo(90);
    default:
      return daysAgo(30);
  }
}

/**
 * Fetch dashboard metrics for a shop.
 */
export async function getDashboardMetrics(
  shopId: string,
  dateRange = "last_30",
): Promise<DashboardMetrics> {
  const startDate = getDateRangeStart(dateRange);

  // Aggregate event counts
  const [events, activeOfferCount] = await Promise.all([
    db.analyticsEvent.findMany({
      where: {
        shopId,
        createdAt: { gte: startDate },
      },
      select: {
        eventType: true,
        revenue: true,
        createdAt: true,
        offerId: true,
      },
    }),
    db.offer.count({
      where: { shopId, status: "active" },
    }),
  ]);

  let totalRevenue = 0;
  let totalImpressions = 0;
  let totalConversions = 0;

  const revenueByDayMap = new Map<string, { revenue: number; conversions: number }>();
  const offerStatsMap = new Map<
    string,
    { impressions: number; conversions: number; revenue: number }
  >();

  for (const event of events) {
    const dayKey = event.createdAt.toISOString().slice(0, 10);

    if (event.eventType === "impression") {
      totalImpressions++;
    } else if (event.eventType === "conversion") {
      totalConversions++;
      totalRevenue += event.revenue || 0;
    }

    // Revenue by day
    if (!revenueByDayMap.has(dayKey)) {
      revenueByDayMap.set(dayKey, { revenue: 0, conversions: 0 });
    }
    const dayStats = revenueByDayMap.get(dayKey)!;
    if (event.eventType === "conversion") {
      dayStats.revenue += event.revenue || 0;
      dayStats.conversions++;
    }

    // Per-offer stats
    if (event.offerId) {
      if (!offerStatsMap.has(event.offerId)) {
        offerStatsMap.set(event.offerId, {
          impressions: 0,
          conversions: 0,
          revenue: 0,
        });
      }
      const offerStats = offerStatsMap.get(event.offerId)!;
      if (event.eventType === "impression") offerStats.impressions++;
      if (event.eventType === "conversion") {
        offerStats.conversions++;
        offerStats.revenue += event.revenue || 0;
      }
    }
  }

  // Build revenue by day array (fill gaps)
  const revenueByDay: DailyRevenue[] = [];
  const now = new Date();
  const dayCount = Math.ceil(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const stats = revenueByDayMap.get(key) || { revenue: 0, conversions: 0 };
    revenueByDay.push({
      date: key,
      revenue: stats.revenue,
      conversions: stats.conversions,
    });
  }

  // Top offers
  const offerIds = Array.from(offerStatsMap.keys());
  const offers =
    offerIds.length > 0
      ? await db.offer.findMany({
          where: { id: { in: offerIds } },
          select: { id: true, name: true, type: true, status: true },
        })
      : [];

  const topOffers: TopOffer[] = offers
    .map((offer) => {
      const stats = offerStatsMap.get(offer.id)!;
      return {
        id: offer.id,
        name: offer.name,
        type: offer.type as TopOffer["type"],
        status: offer.status as TopOffer["status"],
        impressions: stats.impressions,
        conversions: stats.conversions,
        revenue: stats.revenue,
        conversionRate: calcConversionRate(stats.impressions, stats.conversions),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    totalRevenue,
    totalImpressions,
    totalConversions,
    conversionRate: calcConversionRate(totalImpressions, totalConversions),
    aovLift: 0, // Requires base AOV from shop — calculated separately
    activeOffers: activeOfferCount,
    revenueByDay,
    topOffers,
  };
}

/**
 * Fetch detailed analytics overview.
 */
export async function getAnalyticsOverview(
  shopId: string,
  dateRange = "last_30",
): Promise<AnalyticsOverview> {
  const startDate = getDateRangeStart(dateRange);

  const events = await db.analyticsEvent.findMany({
    where: {
      shopId,
      createdAt: { gte: startDate },
    },
    include: { offer: { select: { placement: true } } },
  });

  let totalRevenue = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  const revenueByDayMap = new Map<string, { revenue: number; conversions: number }>();
  const revenueByPlacement: Record<Placement, number> = {
    post_purchase: 0,
    thank_you: 0,
    order_status: 0,
  };

  const offerStatsMap = new Map<
    string,
    { impressions: number; clicks: number; conversions: number; revenue: number }
  >();

  for (const event of events) {
    const dayKey = event.createdAt.toISOString().slice(0, 10);

    switch (event.eventType) {
      case "impression":
        totalImpressions++;
        break;
      case "click":
        totalClicks++;
        break;
      case "conversion":
        totalConversions++;
        totalRevenue += event.revenue || 0;
        // Revenue by placement
        if (event.offer?.placement) {
          const placement = event.offer.placement as Placement;
          revenueByPlacement[placement] =
            (revenueByPlacement[placement] || 0) + (event.revenue || 0);
        }
        break;
    }

    // Daily aggregation
    if (!revenueByDayMap.has(dayKey)) {
      revenueByDayMap.set(dayKey, { revenue: 0, conversions: 0 });
    }
    if (event.eventType === "conversion") {
      const dayStats = revenueByDayMap.get(dayKey)!;
      dayStats.revenue += event.revenue || 0;
      dayStats.conversions++;
    }

    // Per-offer stats
    if (event.offerId) {
      if (!offerStatsMap.has(event.offerId)) {
        offerStatsMap.set(event.offerId, {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        });
      }
      const s = offerStatsMap.get(event.offerId)!;
      if (event.eventType === "impression") s.impressions++;
      if (event.eventType === "click") s.clicks++;
      if (event.eventType === "conversion") {
        s.conversions++;
        s.revenue += event.revenue || 0;
      }
    }
  }

  // Build daily revenue array
  const revenueByDay: DailyRevenue[] = [];
  const now = new Date();
  const dayCount = Math.ceil(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const stats = revenueByDayMap.get(key) || { revenue: 0, conversions: 0 };
    revenueByDay.push({ date: key, ...stats });
  }

  // Top offers
  const offerIds = Array.from(offerStatsMap.keys());
  const offers =
    offerIds.length > 0
      ? await db.offer.findMany({
          where: { id: { in: offerIds } },
          select: { id: true, name: true, type: true, status: true },
        })
      : [];

  const topOffers: TopOffer[] = offers
    .map((offer) => {
      const s = offerStatsMap.get(offer.id)!;
      return {
        id: offer.id,
        name: offer.name,
        type: offer.type as TopOffer["type"],
        status: offer.status as TopOffer["status"],
        impressions: s.impressions,
        conversions: s.conversions,
        revenue: s.revenue,
        conversionRate: calcConversionRate(s.impressions, s.conversions),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalRevenue,
    totalImpressions,
    totalClicks,
    totalConversions,
    conversionRate: calcConversionRate(totalImpressions, totalConversions),
    clickThroughRate: calcConversionRate(totalImpressions, totalClicks),
    averageRevenuePerConversion:
      totalConversions > 0 ? totalRevenue / totalConversions : 0,
    revenueByDay,
    revenueByPlacement,
    topOffers,
  };
}
