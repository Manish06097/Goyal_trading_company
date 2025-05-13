"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import CustomerFormModal from "@/components/customers/CustomerFormModal";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { EditIcon, TrashIcon } from "lucide-react";
import Toast from "@/components/ui/toast";

interface Customer {
  id: number;
  name?: string;
  address?: string;
  gstin?: string;
  phone?: string;
  tan?: string;
  fssai?: string;
}

export default function CustomerManagementPage() {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/customers/`);
      if (!response.ok) {
        throw new Error(`Error fetching customers: ${response.statusText}`);
      }
      const data: Customer[] = await response.json();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message);
      setNotification({ message: `Error fetching customers: ${err.message}`, type: 'error' });
      console.error("Error fetching customers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/customers/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) {
        throw new Error(`Error adding customer: ${response.statusText}`);
      }
      const newCustomer: Customer = await response.json();
      fetchCustomers();
      setNotification({ message: 'Customer added successfully!', type: 'success' });
      return newCustomer;
    } catch (err: any) {
      setError(err.message);
      setNotification({ message: `Error adding customer: ${err.message}`, type: 'error' });
      console.error("Error adding customer:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomer = async (customerData: Customer): Promise<Customer> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) {
        throw new Error(`Error updating customer: ${response.statusText}`);
      }
      const updatedCustomer: Customer = await response.json();
      fetchCustomers();
      setNotification({ message: 'Customer updated successfully!', type: 'success' });
      return updatedCustomer;
    } catch (err: any) {
      setError(err.message);
      setNotification({ message: `Error updating customer: ${err.message}`, type: 'error' });
      console.error("Error updating customer:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCustomer = async (id: number): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Error deleting customer: ${response.statusText}`);
      }
      fetchCustomers();
      setNotification({ message: 'Customer deleted successfully!', type: 'success' });
    } catch (err: any) {
      setError(err.message);
      setNotification({ message: `Error deleting customer: ${err.message}`, type: 'error' });
      console.error("Error deleting customer:", err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    return searchTerm === '' ||
      (customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.gstin && customer.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.tan && customer.tan.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.fssai && customer.fssai.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex">
      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Customer Management</h1>
          <p className="text-gray-600 text-sm">Manage all your customers here</p>
        </div>
        <div className="flex justify-end mb-6">
          <Button className="px-8" onClick={() => { setSelectedCustomer(null); setIsFormModalOpen(true); }}>
            Add Customer
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search by name, email, phone..."
            className="flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading customers...</p>
              </div>
            ) : (
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[40px]"><input type="checkbox" /></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>TAN</TableHead>
                    <TableHead>FSSAI</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell className="w-[40px]"><input type="checkbox" /></TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.address}</TableCell>
                      <TableCell>{customer.gstin}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.tan}</TableCell>
                      <TableCell>{customer.fssai}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-10 hover:bg-gray-100 rounded-full" onClick={() => { setSelectedCustomer(customer ? {...customer} : null); setIsFormModalOpen(true); }} aria-label={`Edit customer ${customer.name}`}>
                          <EditIcon className="size-5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="destructive" className="size-10 hover:bg-red-100 rounded-full" aria-label={`Delete customer ${customer.name}`}>
                              <TrashIcon className="size-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the customer "{customer.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCustomer(customer.id)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

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

      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaveSuccess={fetchCustomers}
        customer={selectedCustomer || undefined}
        customerId={selectedCustomer?.id}
      />

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