import React from "react";
import { AlertTriangle } from "lucide-react";
import { AdminButton } from "../admin/AdminPrimitives";
import { AdminModal } from "../admin/AdminModal";

interface StudentDeleteConfirmationModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; studentCount: number; isLoading?: boolean; }

export const StudentDeleteConfirmationModal: React.FC<StudentDeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, studentCount, isLoading = false }) => (
  <AdminModal open={isOpen} onClose={onClose} title="Delete Students" size="sm" closeOnBackdrop={!isLoading} closeOnEscape={!isLoading} footer={<><AdminButton variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</AdminButton><AdminButton variant="danger" onClick={onConfirm} disabled={isLoading} icon={AlertTriangle}>{isLoading ? "Deleting..." : "Delete"}</AdminButton></>}>
    <p className="dsp-admin-confirmation-copy">Are you sure you want to delete <strong>{studentCount}</strong> student{studentCount > 1 ? "s" : ""}? This action cannot be undone.</p>
  </AdminModal>
);
