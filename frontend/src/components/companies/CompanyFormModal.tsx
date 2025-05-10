"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define form schema (placeholder)
const formSchema = z.object({
  name: z.string().optional(),
  logo: z.string().optional(), // Keep this for displaying existing logo URL if editing
  logoFile: z.any().optional(), // Add field for the file object
  gst_number: z.string().optional(),
  pan_number: z.string().optional(),
  tan_number: z.string().optional(),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().optional(),
  authorized_signature_image: z.string().optional(), // Keep this for displaying existing signature URL if editing
  authorizedSignatureFile: z.any().optional(), // Add field for the file object
});

export type CompanyFormValues = z.infer<typeof formSchema>;

interface Company {
  id?: number;
  name?: string; // Made name optional
  logo?: string;
  gst_number?: string;
  pan_number?: string;
  tan_number?: string;
  address?: string;
  phone_number?: string;
  email?: string;
  authorized_signature_image?: string;
}

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: Company | null; // Optional company data for editing, can be null
  onSave: (data: CompanyFormValues) => Promise<void>; // Update onSave prop type
}

import { useState, useEffect } from 'react'; // Import useEffect

export default function CompanyFormModal({ isOpen, onClose, company, onSave }: CompanyFormModalProps) {
  const isEditing = !!company;
  const title = isEditing ? "Edit Company" : "New Company";

  // Initialize form with default values or company data
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && company ? { // Ensure company is not null/undefined
      name: company.name,
      logo: company.logo ?? '',
      logoFile: undefined, // Explicitly set file input default to undefined
      gst_number: company.gst_number ?? '',
      pan_number: company.pan_number ?? '',
      tan_number: company.tan_number ?? '',
      address: company.address ?? '',
      phone_number: company.phone_number ?? '',
      email: company.email ?? '',
      authorized_signature_image: company.authorized_signature_image ?? '',
      authorizedSignatureFile: undefined, // Explicitly set file input default to undefined
    } : {
      name: "",
      logo: "",
      logoFile: undefined, // Also set to undefined for new company
      gst_number: "",
      pan_number: "",
      tan_number: "",
      address: "",
      phone_number: "",
      email: "",
      authorized_signature_image: "",
      authorizedSignatureFile: undefined, // Also set to undefined for new company
    },
  });

  // Reset form when modal opens and company data changes for editing
  useEffect(() => {
    if (isOpen && company) {
      form.reset({
        name: company.name,
        logo: company.logo ?? '',
        logoFile: undefined,
        gst_number: company.gst_number ?? '',
        pan_number: company.pan_number ?? '',
        tan_number: company.tan_number ?? '',
        address: company.address ?? '',
        phone_number: company.phone_number ?? '',
        email: company.email ?? '',
        authorized_signature_image: company.authorized_signature_image ?? '',
        authorizedSignatureFile: undefined,
      });
    } else if (isOpen && !company) {
       // Reset for new company when modal opens
       form.reset({
        name: "",
        logo: "",
        logoFile: undefined,
        gst_number: "",
        pan_number: "",
        tan_number: "",
        address: "",
        phone_number: "",
        email: "",
        authorized_signature_image: "",
        authorizedSignatureFile: undefined,
       });
    }
  }, [isOpen, company, form.reset]); // Depend on isOpen, company, and form.reset

  async function onSubmit(values: CompanyFormValues) {
    console.log("Form submitted:", values);
    await onSave(values); // Use the onSave prop
    onClose(); // Close modal after save
    // TODO: Show toast notification
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto px-4"> {/* Added max-height and overflow-y-auto */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (for existing logo)</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Logo URL" {...field} disabled={!!form.watch('logoFile')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Upload Logo</FormLabel>
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        accept="image/*"
                        onChange={(event) => onChange(event.target.files && event.target.files[0])}
                        disabled={!!form.watch('logo')} // Disable if logo URL is present
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gst_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number</FormLabel>
                    <FormControl>
                      <Input placeholder="GST Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pan_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl>
                      <Input placeholder="PAN Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tan_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TAN Number</FormLabel>
                    <FormControl>
                      <Input placeholder="TAN Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="authorized_signature_image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authorized Signature Image URL (for existing signature)</FormLabel>
                    <FormControl>
                      <Input placeholder="Authorized Signature Image URL" {...field} disabled={!!form.watch('authorizedSignatureFile')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="authorizedSignatureFile"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Upload Authorized Signature</FormLabel>
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        accept="image/*"
                        onChange={(event) => onChange(event.target.files && event.target.files[0])}
                        disabled={!!form.watch('authorized_signature_image')} // Disable if signature URL is present
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div> {/* Closing div for scrollable content */}
          </form>
        </Form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={!form.formState.isValid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
