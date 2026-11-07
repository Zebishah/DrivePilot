import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useRef } from "react";

interface LogoutDialogProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LogoutDialog({
  open,
  busy,
  error,
  onCancel,
  onConfirm,
}: LogoutDialogProps) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      disableEscapeKeyDown={busy}
      aria-labelledby="logout-dialog-title"
      aria-describedby="logout-dialog-description"
      fullWidth
      maxWidth="xs"
      TransitionProps={{ onEntered: () => cancelButton.current?.focus() }}
    >
      <DialogTitle id="logout-dialog-title">Log out of Drive Pilot?</DialogTitle>
      <DialogContent>
        <DialogContentText id="logout-dialog-description">
          You’ll need to sign in again to access your workspace. Unsaved changes
          will be lost.
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button ref={cancelButton} autoFocus onClick={onCancel} disabled={busy}>
          Stay signed in
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={busy}
          startIcon={
            busy ? <CircularProgress size={18} color="inherit" /> : undefined
          }
        >
          {busy ? "Logging out…" : "Log out"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
