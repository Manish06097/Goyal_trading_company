"use client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState } from 'react';

interface DeleteCompanyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string; // Company name to display in the confirmation message
  onConfirm: () => Promise<void>; // Function to call when delete is confirmed
  isDeleting: boolean; // Add isDeleting prop for loading state
}

export default function DeleteCompanyDialog({ isOpen, onClose, companyName, onConfirm, isDeleting }: DeleteCompanyDialogProps) {
  // Remove local isLoading state as it's now controlled by the parent
  // const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    // The loading state is now managed by the parent component via the isDeleting prop
    await onConfirm(); // Call the onConfirm function provided by the parent
    // onClose(); // The parent will close the dialog after the async operation
    // TODO: Show toast notification
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Company?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {companyName}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}