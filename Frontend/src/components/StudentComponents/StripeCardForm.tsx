import React, { useState } from "react";
import {
  useStripe,
  useElements,
  CardElement,
} from "@stripe/react-stripe-js";
import { Box, Button, Typography, CircularProgress } from "@mui/material";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#32325d",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased" as const,
      fontSize: "16px",
      "::placeholder": { color: "#aab7c4" },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
};

type StripeCardFormProps = {
  amount: number;
  onSuccess: (
    paymentMethodId: string,
    cardLast4?: string,
    cardBrand?: string
  ) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

/**
 * Renders inside <Elements stripe={stripePromise}>.
 * Collects card via CardElement; on submit creates a PaymentMethod and calls onSuccess.
 * Backend will then create + confirm PaymentIntent with that payment method.
 */
export function StripeCardForm({
  amount,
  onSuccess,
  onError,
  disabled = false,
}: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    onError("");

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError("Card form not ready");
      setLoading(false);
      return;
    }

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {},
      });

      if (error) {
        onError(error.message || "Payment failed");
        setLoading(false);
        return;
      }

      if (!paymentMethod?.id) {
        onError("Could not create payment method");
        setLoading(false);
        return;
      }

      const card = paymentMethod.card;
      onSuccess(
        paymentMethod.id,
        card?.last4,
        card?.brand ?? undefined
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed";
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Card details
      </Typography>
      <Box
        sx={{
          p: 1.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
        }}
      >
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </Box>
      <Box sx={{ mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={!stripe || !elements || loading || disabled}
          sx={{
            bgcolor: "#5ec2d2",
            "&:hover": { bgcolor: "rgba(65, 135, 147)" },
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            `Pay CHF ${amount.toFixed(2)} and confirm booking`
          )}
        </Button>
      </Box>
    </form>
  );
}
