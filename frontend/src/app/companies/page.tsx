"use client";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import CompanyFormModal, { CompanyFormValues } from "@/components/companies/CompanyFormModal";
import DeleteCompanyDialog from "@/components/companies/DeleteCompanyDialog";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { format } from 'date-fns'; // Import date-fns format function

// Add imports for icons (assuming lucide-react)
import { EditIcon, TrashIcon } from "lucide-react";

interface Company {
  id: number;
  name: string;
  logo?: string;
  gst_number?: string;
  pan_number?: string;
  tan_number?: string;
  address?: string;
  phone_number?: string;
  email?: string;
  authorized_signature_image?: string;
}

export default function CompanyManagementPage() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null); // Company data for editing/deleting

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false); // State for delete loading
  const [error, setError] = useState<string | null>(null);
useEffect(() => {
    fetchCompanies();
  }, []);

  // API functions
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  console.log("API_BASE_URL:", API_BASE_URL); // Add this line for debugging

  const fetchCompanies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/`);
      if (!response.ok) {
        throw new Error(`Error fetching companies: ${response.statusText}`);
      }
      const data: Company[] = await response.json();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching companies:", err);
    } finally {
      setIsLoading(false);
      console.log("setIsLoading(false) called. isLoading:", false); // Add this log
    }
  };

  const addCompany = async (companyData: Omit<Company, 'id'>): Promise<Company> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });
      if (!response.ok) {
        throw new Error(`Error adding company: ${response.statusText}`);
      }
      const newCompany: Company = await response.json();
      fetchCompanies(); // Refresh the list after adding
      return newCompany;
    } catch (err: any) {
      setError(err.message);
      console.error("Error adding company:", err);
      throw err; // Re-throw to be caught by modal's onSave
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompany = async (companyData: Company): Promise<Company> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });
      if (!response.ok) {
        throw new Error(`Error updating company: ${response.statusText}`);
      }
      const updatedCompany: Company = await response.json();
      fetchCompanies(); // Refresh the list after updating
      return updatedCompany;
    } catch (err: any) {
      setError(err.message);
      console.error("Error updating company:", err);
      throw err; // Re-throw to be caught by modal's onSave
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCompany = async (id: number): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting company: ${response.statusText}`);
      }
      fetchCompanies(); // Refresh the list after deleting
    } catch (err: any) {
      setError(err.message);
      console.error("Error deleting company:", err);
      throw err; // Re-throw to be caught by dialog's onConfirm
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex">
      {/* Sidebar Placeholder */}
      {/* <Sidebar /> */}

      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Company Management</h1>
          <Button variant="default" onClick={() => { setSelectedCompany(null); setIsFormModalOpen(true); }}>Add Company</Button>
        </div>

        {/* Data Table Placeholder */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            {/* Spinner Placeholder */}
            {/* Replace with actual Spinner component */}
            <div>Loading...</div>
            <p className="mt-2">Loading companies...</p>
          </div>
        ) : ( // Render table even if companies list is empty
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(company => (
                <TableRow key={company.id}>
                  <TableCell>{company.name}</TableCell>
                  <TableCell>{company.gst_number}</TableCell>
                  <TableCell>{company.phone_number}</TableCell>
                  <TableCell>{company.email}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedCompany(company); setIsFormModalOpen(true); }}>
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setSelectedCompany(company); setIsDeleteDialogOpen(true); }}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {error && (
          <div className="text-red-500 mt-4">
            Error: {error}
          </div>
        )}
      </div>

      {/* Company Form Modal */}
      <CompanyFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        company={selectedCompany}
        onSave={async (data: CompanyFormValues) => {
          try {
            if (selectedCompany) {
              // Update existing company
              const updatedCompanyData = {
                ...selectedCompany,
                ...data,
              };
              await updateCompany(updatedCompanyData);
              // TODO: Show success toast
            } else {
              // Add new company
              await addCompany(data);
              // TODO: Show success toast
            }
            setIsFormModalOpen(false);
            setSelectedCompany(null);
          } catch (error) {
            // Error handling is done in the API functions, but we might want a toast here too
            console.error("Save failed:", error);
            // TODO: Show error toast
          }
        }}
      />

      {/* Delete Company Dialog */}
      <DeleteCompanyDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        companyName={selectedCompany?.name || ''} // Pass company name for dialog message
        onConfirm={async () => {
          if (selectedCompany) {
            try {
              await deleteCompany(selectedCompany.id);
              // TODO: Show success toast
            } catch (error) {
              // Error handling is done in the API functions, but we might want a toast here too
              console.error("Delete failed:", error);
              // TODO: Show error toast
            } finally {
              setIsDeleteDialogOpen(false);
              setSelectedCompany(null);
            }
          }
        }}
        isDeleting={isDeleting} // Pass loading state to dialog
      />
    </div>
  );
}