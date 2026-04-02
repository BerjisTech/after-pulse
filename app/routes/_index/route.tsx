import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function LandingPage() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <div className={styles.badge}>AI-Powered</div>
        <h1 className={styles.heading}>
          AfterPulse
        </h1>
        <p className={styles.text}>
          Increase your Average Order Value with smart, AI-powered post-purchase
          upsells. Show the right offer to the right customer at the right time.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" placeholder="your-store.myshopify.com" />
            </label>
            <button className={styles.button} type="submit">
              Get Started
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>🚀 Smart Upsells</strong>. AI-generated offers based on customer
            behavior and purchase patterns.
          </li>
          <li>
            <strong>📈 Increase AOV</strong>. Show personalized post-purchase offers
            that convert at 2-3x industry average.
          </li>
          <li>
            <strong>⚡ Zero Friction</strong>. One-click upsells on Thank You and
            Order Status pages — no checkout interruption.
          </li>
        </ul>
      </div>
    </div>
  );
}
