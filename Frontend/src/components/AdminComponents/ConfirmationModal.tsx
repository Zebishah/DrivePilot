import React from "react";
import { AlertTriangle } from "lucide-react";
import { AdminButton } from "../admin/AdminPrimitives";
import { AdminModal } from "../admin/AdminModal";

interface ConfirmationModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; cancelText?: string; variant?: "default" | "danger"; }

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "default" }) => (
  <AdminModal open={isOpen} onClose={onClose} title={title} size="sm" footer={<><AdminButton variant="secondary" onClick={onClose}>{cancelText}</AdminButton><AdminButton variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm} icon={variant === "danger" ? AlertTriangle : undefined}>{confirmText}</AdminButton></>}>
    <p className="dsp-admin-confirmation-copy">{message}</p>
  </AdminModal>
);

export default ConfirmationModal;
