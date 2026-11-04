import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { loadStripe } from "@stripe/stripe-js";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import {
  GET_T48_CLIENT_SECRET,
  COMPLETE_T48_SLOT_PAYMENT,
  CREATE_CHECKOUT_SESSION_FOR_PENDING_BOOKING,
} from "../../../graphql/mutations/studentBooking";
import { BackButton } from "../../../components/InstructorComponent/common/BackButton";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);

export const CompletePaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("bookingId");
  const slotId = searchParams.get("slotId");

  const [getClientSecret, { loading: loadingSecret }] =
    useMutation(GET_T48_CLIENT_SECRET);
  const [completePayment, { loading: completing }] =
    useMutation(COMPLETE_T48_SLOT_PAYMENT);
  const [createPendingCheckout] = useMutation(
    CREATE_CHECKOUT_SESSION_FOR_PENDING_BOOKING,
  );

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "no_params"
  >(bookingId && slotId ? "idle" : "no_params");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showStuckOption, setShowStuckOption] = useState(false);
  const startedRef = useRef(false);

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/student-dashboard/complete-payment?bookingId=${bookingId || ""}&slotId=${slotId || ""}`
      : "";

  // If still loading after 10s, show "Nothing opened? Go back" so user isn't stuck
  React.useEffect(() => {
    if (status !== "loading") return;
    const t = setTimeout(() => setShowStuckOption(true), 10_000);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!bookingId || !slotId || status !== "idle" || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      setStatus("loading");
      setErrorMessage("");

      // Timeout after 90s so we don't hang forever (e.g. 3DS modal not showing or API stuck)
      const timeoutMs = 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("This is taking longer than usual. If a bank verification window opened (or a pop-up), complete it. Otherwise try again from Booked lessons or check that pop-ups are not blocked."));
        }, timeoutMs);
      });

      const STRIPE_STEP_TIMEOUT_MS = 15000; // don't hang if Stripe retrieve/confirm never resolves

      const flow = async () => {
        let data;
        try {
          const result = await getClientSecret({
            variables: { bookingId, slotId },
          });
          data = result.data;
        } catch (secretErr: unknown) {
          const apollo = secretErr as {
            message?: string;
            graphQLErrors?: Array<{ message?: string }>;
          };
          const message =
            apollo?.graphQLErrors?.[0]?.message ||
            apollo?.message ||
            (secretErr instanceof Error ? secretErr.message : String(secretErr));
          if (/no payment method found/i.test(message) && bookingId) {
            const checkout = await createPendingCheckout({
              variables: { bookingId },
            });
            const url = checkout.data?.createCheckoutSessionForPendingBooking?.url;
            if (url) {
              window.location.href = url;
              return null;
            }
          }
          throw secretErr instanceof Error
            ? secretErr
            : new Error(message || "Could not start payment.");
        }
        if (cancelled) return;
        const clientSecret = data?.getT48ClientSecret;
        // Backend returns null when slot is already paid (e.g. user returns from 3DS after webhook).
        // Treat that as success so the user sees a clean confirmation, not an error.
        if (clientSecret === null) {
          return { id: "already-paid" } as unknown as { id: string };
        }
        if (!clientSecret) {
          throw new Error("Could not get payment details. Please try again from your dashboard.");
        }
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error("Payment system is not available. Please try again later.");
        }

        const stripeStepPromise = (async () => {
          // Retrieve current state (server may have confirmed so PI is requires_action with redirect_to_url)
          let existing;
          try {
            const result = await stripe.retrievePaymentIntent(clientSecret);
            existing = result?.paymentIntent ?? null;
          } catch (retrieveErr) {
            const msg = retrieveErr instanceof Error ? retrieveErr.message : String(retrieveErr);
            throw new Error(`Could not load payment: ${msg}. Check that your Stripe key matches the server.`);
          }
          if (cancelled) return null;
          if (!existing) {
            throw new Error("Could not load payment. Please try again from your dashboard.");
          }

          // If 3DS uses redirect (bank page), go there immediately; user returns to this URL when done
          if (existing.status === "requires_action" && existing.next_action?.redirect_to_url?.url) {
            window.location.href = existing.next_action.redirect_to_url.url;
            return null; // never resolves; page will navigate
          }

          let paymentIntent = existing;

          if (existing.status === "requires_action" || existing.status === "requires_confirmation" || existing.status === "requires_payment_method") {
            const opts = returnUrl ? { return_url: returnUrl } : undefined;
            const { error, paymentIntent: confirmed } = await stripe.confirmCardPayment(clientSecret, opts as { return_url?: string });
            if (cancelled) return null;
            if (error) throw error;
            if (confirmed) paymentIntent = confirmed;
            if (paymentIntent?.status === "requires_action" && paymentIntent?.next_action?.redirect_to_url?.url) {
              window.location.href = paymentIntent.next_action.redirect_to_url.url;
              return null;
            }
          }

          if (paymentIntent?.status !== "succeeded" || !paymentIntent.id) {
            throw new Error("Payment was not completed. Please try again.");
          }
          return paymentIntent;
        })();

        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(
            () => reject(new Error("Payment window did not open in time. Try the link below to open in a new tab, or go back to Booked lessons and try again.")),
            STRIPE_STEP_TIMEOUT_MS
          );
        });

        const paymentIntent = await Promise.race([stripeStepPromise, timeoutPromise]);
        if (cancelled || !paymentIntent) return null;

        try {
          await completePayment({ variables: { paymentIntentId: paymentIntent.id } });
        } catch {
          // Webhook may have already updated; continue to success
        }
        return paymentIntent;
      };

      try {
        const result = await Promise.race([flow(), timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        if (cancelled) return;
        if (result) setStatus("success");
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(
            err instanceof Error ? err.message : "Something went wrong. Please try again."
          );
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      startedRef.current = false; // allow re-run when effect runs again (e.g. React Strict Mode)
      if (timeoutId) clearTimeout(timeoutId);
    };
    // Run once when we have bookingId and slotId; startedRef prevents double run
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run on mount when params present
  }, [bookingId, slotId]);

  const loading = loadingSecret || completing || status === "loading";

  if (status === "no_params") {
    return (
      <Box className="dsp-student-payment-completion" sx={{ p: 3, maxWidth: 560, mx: "auto" }}>
        <BackButton to="/student-dashboard/book" />
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Complete payment
            </Typography>
            <Typography color="text.secondary">
              No booking or slot specified. Please open the link from your
              email or go to your dashboard and click &quot;Complete payment&quot; on a
              pending lesson.
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2, bgcolor: "var(--ws-primary, #5fc2d3)" }}
              onClick={() => navigate("/student-dashboard/book")}
            >
              Go to Booked lessons
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box className="dsp-student-payment-completion" sx={{ p: 3, mx: "auto" }}>
      <BackButton to="/student-dashboard/book" />
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <PaymentIcon color="primary" />
            <Typography variant="h6">Complete payment for your lesson</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Payment links from email are valid for about 24 hours. If the link has expired, go to your dashboard (Booked lessons) and use the &quot;Complete payment&quot; button there.
          </Typography>

          {loading && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <CircularProgress size={24} />
                <Typography>
                  Opening payment confirmation… You may be redirected to your bank to
                  verify (3D Secure), then returned here.
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                If a verification window or pop-up appeared (from your bank), complete it. Check behind this tab or allow pop-ups for this site if nothing appeared.
              </Typography>
              {showStuckOption && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Nothing opened and still loading?
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="a"
                      href={typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: "none" }}
                    >
                      Open this page in a new tab and try again
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/student-dashboard/book")}
                      sx={{ textTransform: "none" }}
                    >
                      Go back to Booked lessons and try again
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {status === "success" && (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Payment completed successfully. Your lesson is confirmed.
              </Alert>
              <Button
                variant="contained"
                sx={{ bgcolor: "var(--ws-primary, #5fc2d3)" }}
                onClick={() => navigate("/student-dashboard/book")}
              >
                Back to Booked lessons
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                If your link has expired, go to Booked lessons and click &quot;Complete payment&quot; on the pending lesson to try again.
              </Typography>
              <Button
                variant="contained"
                sx={{ bgcolor: "var(--ws-primary, #5fc2d3)" }}
                onClick={() => navigate("/student-dashboard/book")}
              >
                Back to Booked lessons
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
