import { Box, Typography } from "@mui/material";
import { MailCheck } from "lucide-react";

interface EmailDeliveryNoticeProps {
  email: string;
  kind: "password-reset" | "verification";
}

export default function EmailDeliveryNotice({
  email,
  kind,
}: EmailDeliveryNoticeProps) {
  const isPasswordReset = kind === "password-reset";

  return (
    <Box sx={{ width: "100%", textAlign: "center" }}>
      <Box
        className="dsp-auth-otp-card__icon"
        sx={{ mb: 2 }}
        aria-hidden="true"
      >
        <MailCheck size={24} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {isPasswordReset
          ? "Reset instructions requested for"
          : "Verification code sent to"}
      </Typography>
      <Typography sx={{ mt: 0.5, fontWeight: 700, overflowWrap: "anywhere" }}>
        {email}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        {isPasswordReset
          ? "If this email is linked to a password-based account, we’ll send a reset link. Open it to choose a new password. The link expires in 1 hour."
          : "Enter the 6-digit code below to continue. Your code expires in 10 minutes."}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        It may take a few minutes to arrive. If you don’t see it, check your
        spam or junk folder.
      </Typography>
    </Box>
  );
}
