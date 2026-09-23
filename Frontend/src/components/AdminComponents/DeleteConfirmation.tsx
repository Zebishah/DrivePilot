import React from "react";
import { AlertTriangle } from "lucide-react";
import { AdminButton } from "../admin/AdminPrimitives";
import { AdminModal } from "../admin/AdminModal";

interface DeleteConfirmationModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; instructorCount: number; isLoading?: boolean; }

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, instructorCount, isLoading = false }) => (
  <AdminModal open={isOpen} onClose={onClose} title="Delete Instructors" size="sm" closeOnBackdrop={!isLoading} closeOnEscape={!isLoading} footer={<><AdminButton variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</AdminButton><AdminButton variant="danger" onClick={onConfirm} disabled={isLoading} icon={AlertTriangle}>{isLoading ? "Deleting..." : "Delete"}</AdminButton></>}>
    <p className="dsp-admin-confirmation-copy">Are you sure you want to delete <strong>{instructorCount}</strong> instructor{instructorCount > 1 ? "s" : ""}? This action cannot be undone.</p>
  </AdminModal>
);
