"use client";

import React, { useState, useEffect, useCallback } from "react";
import { InvoiceFormModal } from "@/components/billing/InvoiceFormModal"; // Assuming types are exported from modal
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { EditIcon, TrashIcon, EyeIcon, Loader2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { useAppToast } from '../../contexts/ToastContext';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- INTERFACES (Matching API Response for DeliveryOrder on the page) ---
interface NestedCompany { id: number; name?: string; }
interface NestedCustomer { id: number; name: string; }
interface LineItemAPI { id?: number; mill: string; bargain_no: string; quality: string; quantity_quintals: string; rate: string; amount: string; }
interface ChargesAPI { id?: number; insurance_description?: string | null; insurance_amount?: string | null; penalty_description?: string | null; penalty_amount?: string | null; tds_pct?: string | null; tds_amount?: string | null; gst_pct?: string | null; gst_amount?: string | null; total_invoice_amount?: string | null; }
interface PaymentDetailAPI { id?: number; payment_date: string; utr_no: string; utr_amount: string; adjust_amount: string; created_at: string; }
interface RemarkAPI { id?: number; text: string; sequence: number; created_at: string; }

interface DeliveryOrder {
  id: number;
  invoice_number: string;
  seller_company_id: number;
  buyer_customer_id: number;
  consignee_customer_id?: number | null;
  invoice_date: string | null | undefined;
  due_date: string | null | undefined;
  do_number?: string | null;
  do_date?: string | null;
  truck_no?: string | null;
  seller_company: NestedCompany;
  buyer_customer: NestedCustomer;
  consignee_customer?: NestedCustomer | null;
  line_items: LineItemAPI[];
  charges: ChargesAPI;
  payment_details: PaymentDetailAPI[];
  remarks: RemarkAPI[];
  created_at: string;
  updated_at: string;
}


export default function BillingManagementPage() {
  const { addToast } = useAppToast();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<DeliveryOrder | null>(null);

  const [invoices, setInvoices] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const fetchDeliveryOrders = useCallback(async (skip: number = 0, limit: number = 10000) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/delivery_orders/?skip=${skip}&limit=${limit}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error fetching delivery orders: ${response.statusText}`);
      }
      const data: DeliveryOrder[] = await response.json();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message);
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, addToast]);

  useEffect(() => {
    fetchDeliveryOrders();
  }, [fetchDeliveryOrders]);

  const handleDeleteInvoice = async (id: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/delivery_orders/${id}`, { method: 'DELETE' });
      if (response.status === 204 || response.ok) { // 204 No Content is success for DELETE
        addToast('Invoice deleted successfully!', 'success');
        fetchDeliveryOrders();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error deleting invoice: ${response.statusText}`);
      }
    } catch (err: any) {
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditInvoice = (invoice: DeliveryOrder) => {
    setSelectedInvoice(invoice);
    setIsFormModalOpen(true);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === '' ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.seller_company?.name && invoice.seller_company.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.buyer_customer?.name && invoice.buyer_customer.name.toLowerCase().includes(searchTerm.toLowerCase()));
    let matchesDate = true;
    if (startDate || endDate) {
        try {
            if (typeof invoice.invoice_date === 'string') {
                const invoiceDateObj = parseISO(invoice.invoice_date);
                if (startDate && endDate) matchesDate = invoiceDateObj >= startDate && invoiceDateObj <= endDate;
                else if (startDate) matchesDate = invoiceDateObj >= startDate;
                else if (endDate) matchesDate = invoiceDateObj <= endDate;
            } else {
                matchesDate = false; // Cannot match date if invoice_date is not a string
            }
        } catch (e) { matchesDate = false; }
    }
    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Delivery Orders</h1>
        <p className="text-gray-600 text-sm">Manage all your delivery orders and associated invoices.</p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <Button variant="default" onClick={() => { setSelectedInvoice(null); setIsFormModalOpen(true); }}>
          New Delivery Order
        </Button>
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
          <Input type="search" placeholder="Search invoice # or client..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
            className="w-full md:w-64" />
          <div className="w-full md:w-auto">
            <DatePicker selectsRange={true} startDate={startDate} endDate={endDate}
              onChange={(update: [Date | null, Date | null]) => { setDateRange(update); setCurrentPage(1);}}
              isClearable={true} placeholderText="Filter by invoice date"
              className="w-full p-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              wrapperClassName="w-full md:w-auto" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading delivery orders...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
          ) : paginatedInvoices.length === 0 ? (
             <div className="p-6 text-center text-muted-foreground">No delivery orders found.</div>
          ) : (
            <Table className="min-w-full">
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => {
                  console.log("Invoice dates:", invoice.invoice_date, invoice.due_date);
                  return (
                  <TableRow key={invoice.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.seller_company?.name || 'N/A'}</TableCell>
                    <TableCell>{invoice.buyer_customer?.name || 'N/A'}</TableCell>
                    <TableCell>{invoice.invoice_date ? format(parseISO(invoice.invoice_date), 'PP') : 'N/A'}</TableCell>
                    <TableCell>{invoice.due_date ? format(parseISO(invoice.due_date), 'PP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                        {invoice.charges?.total_invoice_amount
                            ? `$${parseFloat(invoice.charges.total_invoice_amount).toFixed(2)}`
                            : 'N/A'}
                    </TableCell>
                    <TableCell className="flex items-center justify-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditInvoice(invoice)} aria-label={`Edit invoice ${invoice.invoice_number}`}>
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" aria-label={`Delete invoice ${invoice.invoice_number}`}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete invoice "{invoice.invoice_number}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );})}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-4 mt-6">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1 || isLoading}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || isLoading}>Next</Button>
        </div>
      )}

      <InvoiceFormModal
        open={isFormModalOpen}
        setOpen={setIsFormModalOpen}
        invoiceData={selectedInvoice} 
        onInvoiceCreated={() => {
          fetchDeliveryOrders(); // Refresh the list
          setSelectedInvoice(null); // Clear selection after modal interaction
        }}
      />
    </div>
  );
}