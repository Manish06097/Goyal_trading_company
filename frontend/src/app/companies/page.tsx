"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import CompanyFormModal, { CompanyFormValues } from "@/components/companies/CompanyFormModal";
import DeleteCompanyDialog from "@/components/companies/DeleteCompanyDialog";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input"; // Import Input component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { format } from 'date-fns'; // Import date-fns format function
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import {
  Dialog,
  DialogContent,
  DialogTitle, // Import DialogTitle
} from "@/components/ui/dialog"; // Import Dialog components
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

// Add imports for icons (assuming lucide-react)
import { EditIcon, TrashIcon } from "lucide-react";
import Toast from "@/components/ui/toast";

// State for notifications

interface Company {
  id: number;
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

export default function CompanyManagementPage() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null); // Company data for editing/deleting

  const [companies, setCompanies] = useState<Company[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false); // State for delete loading
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null); // State to track expanded row
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // State for image preview dialog

  // State for Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'active', 'inactive', 'all'
  const [industryFilter, setIndustryFilter] = useState('all'); // Specific industry value or 'all'

  // State for Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Or another default value

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
      setNotification({ message: `Error fetching companies: ${err.message}`, type: 'error' });
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
      setNotification({ message: 'Company added successfully!', type: 'success' });
      return newCompany;
    } catch (err: any) {
      setError(err.message);
      setNotification({ message: `Error adding company: ${err.message}`, type: 'error' });
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
      setNotification({ message: 'Company updated successfully!', type: 'success' });
      return updatedCompany;
    } catch (err: any) {
      setError(err.message);
      setNotification({ message: `Error updating company: ${err.message}`, type: 'error' });
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
      setNotification({ message: 'Company deleted successfully!', type: 'success' });
    } catch (err: any) {
      setError(err.message);
      setNotification({ message: `Error deleting company: ${err.message}`, type: 'error' });
      console.error("Error deleting company:", err);
      throw err; // Re-throw to be caught by dialog's onConfirm
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and paginate companies
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = searchTerm === '' ||
      (company.name && company.name.toLowerCase().includes(searchTerm.toLowerCase())) || // Added check for company.name
      (company.gst_number && company.gst_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase()));
      // Add other fields to search as needed

    // Basic status filtering (assuming a status field exists or can be derived)
    // This is a placeholder; actual implementation depends on company data structure
    const matchesStatus = statusFilter === 'all'; // Placeholder: always true for now

    // Basic industry filtering (assuming an industry field exists)
    // This is a placeholder; actual implementation depends on company data structure
    const matchesIndustry = industryFilter === 'all'; // Placeholder: always true for now

    return matchesSearch && matchesStatus && matchesIndustry;
  });

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex">
      {/* Sidebar Placeholder */}
      {/* <Sidebar /> */}

      <div className="flex-1 p-6 md:p-8"> {/* Apply consistent padding/gutters */}
        <div className="mb-6"> {/* Increased bottom margin for consistency */}
          <h1 className="text-2xl font-bold">Company Management</h1> {/* Slightly larger heading */}
          <p className="text-gray-600 text-sm">Manage all your registered companies here</p> {/* Subtitle */}
        </div>
        <div className="flex justify-end mb-6"> {/* Container for button, aligned right */}
          <Button className="px-8" onClick={() => { setSelectedCompany(null); setIsFormModalOpen(true); }}> {/* Default button is primary */}
            Add Company
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6"> {/* Apply 16px gap between elements */}
          <Input
            placeholder="Search by name, GST, email..."
            className="flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Placeholder for filter buttons */}
          <Button variant="outline" className="flex-shrink-0">Filter 1</Button> {/* Outline button for secondary action */}
          <Button variant="outline" className="flex-shrink-0">Filter 2</Button> {/* Outline button for secondary action */}
        </div>

        {/* Data Table */}
          <div className="bg-white rounded-lg shadow p-6"> {/* White card with rounded corners and shadow, 24px padding */}
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  {/* Simple Loading Indicator */}
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                  <p className="mt-2 text-gray-600">Loading companies...</p>
                </div>
              ) : (
                <Table className="min-w-full"> {/* Added min-w-full for horizontal scroll */}
                  <TableHeader className="sticky top-0 bg-white z-10"> {/* Added sticky header styles */}
                    <TableRow>
                      <TableHead className="w-[40px]"><input type="checkbox" /></TableHead> {/* Checkbox column */}
                      <TableHead>Name</TableHead>
                      <TableHead>Logo</TableHead>
                      <TableHead className="hidden md:table-cell">Address</TableHead> {/* Hide on small screens */}
                      <TableHead className="hidden md:table-cell">Contact</TableHead> {/* Hide on small screens */}
                      <TableHead className="hidden lg:table-cell">GST Number</TableHead> {/* Hide on small/medium screens */}
                      <TableHead className="hidden lg:table-cell">PAN Number</TableHead> {/* Hide on small/medium screens */}
                      <TableHead className="hidden lg:table-cell">TAN Number</TableHead> {/* Hide on small/medium screens */}
                      <TableHead className="hidden lg:table-cell">Authorized Signature</TableHead> {/* Hide on small/medium screens */}
                      <TableHead>Actions</TableHead>
                      <TableHead className="w-[40px]"></TableHead> {/* Column for expand button */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCompanies.map(company => (
                      <React.Fragment key={company.id}>
                        <TableRow className={`even:bg-gray-50 hover:bg-gray-100 ${expandedRow === company.id ? 'border-b-0' : ''}`}> {/* Added zebra-striping and hover */}
                          <TableCell className="w-[40px]"><input type="checkbox" /></TableCell> {/* Checkbox cell */}
                          <TableCell>{company.name}</TableCell>
                          <TableCell>
                            {company.logo && (
                              <div className="size-10 flex items-center justify-center overflow-hidden rounded-sm cursor-pointer" onClick={() => setSelectedImage(`${API_BASE_URL}/images/${company.logo?.split('/').pop()}`)}>
                                <img src={`${API_BASE_URL}/images/${company.logo?.split('/').pop()}`} alt={`${company.name} Logo`} className="size-full object-contain" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-xs truncate" title={company.address}>{company.address}</TableCell> {/* Truncate and add tooltip */}
                          <TableCell className="hidden md:table-cell">
                            {company.phone_number && <div>Phone: {company.phone_number}</div>}
                            {company.email && <div>Email: {company.email}</div>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{company.gst_number}</TableCell>
                          <TableCell className="hidden lg:table-cell">{company.pan_number}</TableCell>
                          <TableCell className="hidden lg:table-cell">{company.tan_number}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {company.authorized_signature_image && (
                              <div className="size-10 flex items-center justify-center overflow-hidden rounded-sm cursor-pointer" onClick={() => setSelectedImage(`${API_BASE_URL}/images/${company.authorized_signature_image?.split('/').pop()}`)}>
                                <img src={`${API_BASE_URL}/images/${company.authorized_signature_image?.split('/').pop()}`} alt={`${company.name} Authorized Signature`} className="size-full object-contain" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="flex items-center gap-1"> {/* Adjusted gap */}
                            <Button size="icon" variant="ghost" className="size-10 hover:bg-gray-100 rounded-full" onClick={() => { setSelectedCompany(company); setIsFormModalOpen(true); }} aria-label={`Edit company ${company.name}`}>
                              <EditIcon className="size-5" />
                            </Button>
                            {/* Inline AlertDialog for Delete */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="destructive" className="size-10 hover:bg-red-100 rounded-full" aria-label={`Delete company ${company.name}`}>
                                  <TrashIcon className="size-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the company "{company.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCompany(company.id)}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="md:hidden size-11"
                              onClick={() => setExpandedRow(expandedRow === company.id ? null : company.id)}
                            >
                              {expandedRow === company.id ? '-' : '+'}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRow === company.id && (
                          <TableRow key={`${company.id}-expanded`} className="md:hidden"> {/* This row is only visible on small screens when expanded */}
                            <TableCell colSpan={11}> {/* Span across all columns, adjusted for new checkbox column */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                                {company.address && (
                                  <div>
                                    <strong className="block text-sm font-medium text-gray-700">Address:</strong>
                                    <p className="text-sm text-gray-900">{company.address}</p>
                                  </div>
                                )}
                                {(company.phone_number || company.email) && (
                                  <div>
                                    <strong className="block text-sm font-medium text-gray-700">Contact:</strong>
                                    {company.phone_number && <p className="text-sm text-gray-900">Phone: {company.phone_number}</p>}
                                    {company.email && <p className="text-sm text-gray-900">Email: {company.email}</p>}
                                  </div>
                                )}
                                {company.gst_number && (
                                  <div>
                                    <strong className="block text-sm font-medium text-gray-700">GST Number:</strong>
                                    <p className="text-sm text-gray-900">{company.gst_number}</p>
                                  </div>
                                )}
                                {company.pan_number && (
                                  <div>
                                    <strong className="block text-sm font-medium text-gray-700">PAN Number:</strong>
                                    <p className="text-sm text-gray-900">{company.pan_number}</p>
                                  </div>
                                )}
                                {company.tan_number && (
                                  <div>
                                    <strong className="block text-sm font-medium text-gray-700">TAN Number:</strong>
                                    <p className="text-sm text-gray-900">{company.tan_number}</p>
                                  </div>
                                )}
                                {company.authorized_signature_image && (
                                  <div>
                                    <strong className="block text-sm font-medium text-gray-700">Authorized Signature:</strong>
                                    <div className="size-10 flex items-center justify-center overflow-hidden rounded-sm cursor-pointer mt-1" onClick={() => setSelectedImage(`${API_BASE_URL}/images/${company.authorized_signature_image?.split('/').pop()}`)}>
                                      <img src={`${API_BASE_URL}/images/${company.authorized_signature_image?.split('/').pop()}`} alt={`${company.name} Authorized Signature`} className="size-full object-contain" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

        {/* Pagination Controls */}
        <div className="flex justify-end items-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>

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
            let logoImagePath = data.logo;
            let signatureImagePath = data.authorized_signature_image;

            // Upload logo image if a file is selected
            if (data.logoFile) {
              const formData = new FormData();
              formData.append('file', data.logoFile);
              try {
                const uploadResponse = await fetch(`${API_BASE_URL}/upload/image`, {
                  method: 'POST',
                  body: formData,
                });
                if (!uploadResponse.ok) {
                  throw new Error(`Error uploading logo image: ${uploadResponse.statusText}`);
                }
                const uploadResult = await uploadResponse.json();
                logoImagePath = uploadResult.path; // Corrected to use 'path'
              } catch (uploadError: any) {
                console.error("Error uploading logo image:", uploadError);
                setNotification({ message: `Error uploading logo image: ${uploadError.message}`, type: 'error' });
                throw uploadError; // Re-throw to prevent saving company with missing image
              }
            }

            // Upload authorized signature image if a file is selected
            if (data.authorizedSignatureFile) {
              const formData = new FormData();
              formData.append('file', data.authorizedSignatureFile);
              try {
                const uploadResponse = await fetch(`${API_BASE_URL}/upload/image`, {
                  method: 'POST',
                  body: formData,
                });
                if (!uploadResponse.ok) {
                  throw new Error(`Error uploading authorized signature image: ${uploadResponse.statusText}`);
                }
                const uploadResult = await uploadResponse.json();
                signatureImagePath = uploadResult.path; // Corrected to use 'path'
              } catch (uploadError: any) {
                console.error("Error uploading authorized signature image:", uploadError);
                setNotification({ message: `Error uploading authorized signature image: ${uploadError.message}`, type: 'error' });
                throw uploadError; // Re-throw to prevent saving company with missing image
              }
            }

            const companyDataToSave = {
              ...data,
              logo: logoImagePath,
              authorized_signature_image: signatureImagePath,
              // Remove file objects before sending to company API
              logoFile: undefined,
              authorizedSignatureFile: undefined,
            };

            if (selectedCompany) {
              // Update existing company
              const updatedCompanyData = {
                ...selectedCompany,
                ...companyDataToSave,
              };
              await updateCompany(updatedCompanyData);
              setNotification({ message: 'Company updated successfully!', type: 'success' });

            } else {
              // Add new company
              await addCompany(companyDataToSave);
              setNotification({ message: 'Company added successfully!', type: 'success' });

            }
            setIsFormModalOpen(false);
            setSelectedCompany(null);
          } catch (error: any) {
            // Error handling is done in the API functions, but we might want a toast here too
            console.error("Save failed:", error);
            setNotification({ message: `Save failed: ${error.message}`, type: 'error' });
          }
        }}
      />

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-screen-md"> {/* Adjust max-width as needed */}
          <VisuallyHidden><DialogTitle>Image Preview</DialogTitle></VisuallyHidden> {/* Added DialogTitle for accessibility */}
          <img src={selectedImage || undefined} alt="Preview" className="max-w-full max-h-[80vh] object-contain mx-auto" /> {/* Changed src={null} to src={undefined} */}
        </DialogContent>
      </Dialog>

        {/* Notification Toast */}
        {notification && (
          <Toast
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
    </div>
  );
}
