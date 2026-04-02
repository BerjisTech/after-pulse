// ─── Analytics Event Tracker ───

import db from "../../db.server";
import type { EventType } from "../offers/types";

interface TrackEventInput {
  shopId: string;
  offerId?: string;
  eventType: EventType;
  orderId?: string;
  revenue?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Record an analytics event and update denormalized offer counters.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  const { shopId, offerId, eventType, orderId, revenue, metadata } = input;

  // Create the event record
  await db.analyticsEvent.create({
    data: {
      shopId,
      offerId: offerId || null,
      eventType,
      orderId: orderId || null,
      revenue: revenue || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  // Update denormalized counters on the Offer
  if (offerId) {
    const updateData: Record<string, { increment: number }> = {};

    switch (eventType) {
      case "impression":
        updateData.impressions = { increment: 1 };
        break;
      case "click":
        updateData.clicks = { increment: 1 };
        break;
      case "conversion":
        updateData.conversions = { increment: 1 };
        if (revenue) {
          updateData.revenue = { increment: revenue };
        }
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await db.offer.update({
        where: { id: offerId },
        data: updateData,
      });
    }
  }
}

/**
 * Track multiple events in a batch.
 */
export async function trackEvents(events: TrackEventInput[]): Promise<void> {
  await Promise.all(events.map(trackEvent));
}
