import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Company {
  id: number;
  name?: string;
  logo?: string;
  gst_number?: string;
  pan_number?: string;
  tan_number?: string;
  address?: string;
  phone_number?: string;
  email?: string;
  authorized_signature_image?: string;
}

interface InvoiceFormModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number | ""; 
  taxRate: number;
  amount: number;
}

export function InvoiceFormModal({ open, setOpen }: InvoiceFormModalProps): React.ReactElement {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: "", taxRate: 0.1, amount: 0 },
  ]);
  const [companyTaxRate] = useState(0.1);
  const [isLoading, setIsLoading] = useState(true);
  const [rowValid, setRowValid] = useState<boolean[]>([false]); 
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const removeItem = (index: number) => {
    setInvoiceItems((items) => items.filter((_, i) => i !== index));
    setRowValid((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = <K extends keyof InvoiceItem>(
    index: number,
    field: K,
    value: InvoiceItem[K]
  ) => {
    setInvoiceItems((items) => {
      const next = [...items];
      if (!next[index]) return items;

      let processedValue = value;
      if (field === "quantity" || field === "taxRate") {
        const numericValue = parseFloat(String(value));
        processedValue = (Number.isNaN(numericValue) ? (field === "quantity" ? 1 : 0) : numericValue) as InvoiceItem[K];
      }
      
      const updatedItem = { ...next[index], [field]: processedValue };

      const numQuantity = Number(updatedItem.quantity);
      const numUnitPrice = Number(updatedItem.unitPrice); 
      const numTaxRate = Number(updatedItem.taxRate);

      updatedItem.amount = numQuantity * numUnitPrice * (1 + numTaxRate);
      next[index] = updatedItem;

      setRowValid((prevRowValid) => {
        const nextRowValid = [...prevRowValid];
        nextRowValid[index] = numQuantity > 0 && numUnitPrice > 0;
        return nextRowValid;
      });
      return next;
    });
  };

  const isFormValid = () => {
    if (invoiceItems.length === 0) return false;
    return rowValid.every((v) => v);
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  }
  const calculateTax = () => {
    return invoiceItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (Number(item.taxRate) || 0), 0);
  }
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  useEffect(() => {
    async function fetchCompanies() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/companies/`);
        if (!res.ok) throw new Error(`Failed to fetch companies: ${res.statusText}`);
        const data: Company[] = await res.json();
        setCompanies(data);
      } catch (err) {
        console.error("Error fetching companies:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCompanies();
  }, [API_BASE_URL]);

  const addItem = () => {
    const newItem: InvoiceItem = { 
      description: "", 
      quantity: 1, 
      unitPrice: "", 
      taxRate: companyTaxRate, 
      amount: 0 
    };
    setInvoiceItems((items) => [...items, newItem]);
    setRowValid((prevRowValid) => [...prevRowValid, false]); 
    
    requestAnimationFrame(() => {
      tbodyRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      const lastDescInput = tbodyRef.current?.querySelector('tr:last-child td:first-child input[type="text"]');
      (lastDescInput as HTMLInputElement)?.focus();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* DialogContent uses flexbox for layout */}
      <DialogContent className="sm:max-w-3xl w-full max-h-screen bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden">
        {/* Header: Not sticky, part of flex flow */}
        <DialogHeader className="flex-shrink-0 bg-white z-10 pt-6 px-6 pb-4 border-b">
          <div>
            <DialogTitle className="text-2xl font-bold">Create New Invoice</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              Add values to fields to create a new invoice.
            </DialogDescription>
          </div>
         
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-auto">
          {/* Inner wrapper for consistent padding */}
          <div className="px-6">
            {/* Main form fields section */}
            <div className="grid gap-6 pt-6 pb-6"> {/* Vertical padding for this block */}
              {/* Company & Customer */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company" className="block mb-1 text-sm font-medium">Company</Label>
                  <Select>
                    <SelectTrigger id="company" className="w-full">
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading && <SelectItem value="loading" disabled>Loading companies...</SelectItem>}
                      {!isLoading && companies.length === 0 && <SelectItem value="no-companies" disabled>No companies found</SelectItem>}
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name || `Company ${c.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer" className="block mb-1 text-sm font-medium">Customer</Label>
                  <Select>
                    <SelectTrigger id="customer" className="w-full">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Add new customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceDate" className="block mb-1 text-sm font-medium">Invoice Date</Label>
                  <input 
                    type="date" 
                    id="invoiceDate" 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                    defaultValue={new Date().toISOString().substring(0, 10)}
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate" className="block mb-1 text-sm font-medium">Due Date</Label>
                  <input 
                    type="date" 
                    id="dueDate" 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
              </div>

              {/* Invoice # & PO */}
              <div className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-3 gap-y-2 items-center">
                <Label htmlFor="invoiceNumber" className="sm:text-right text-sm font-medium">
                  Invoice #
                </Label>
                <input
                  type="text"
                  id="invoiceNumber"
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  placeholder="Auto-generated"
                  disabled
                />
                <Label htmlFor="poReference" className="sm:text-right text-sm font-medium">
                  PO / Reference
                </Label>
                <input
                  type="text"
                  id="poReference"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional: Purchase order #"
                />
              </div>
            </div> {/* End of Main form fields section */}

            {/* Line Items Section */}
            <div className="mb-6"> {/* Spacing after form fields, before line items */}
              <div className="overflow-x-auto border rounded-lg relative">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-[5]"> 
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Tax (e.g. 0.1)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Amount</th>
                      <th className="px-4 py-3 w-12"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" ref={tbodyRef}>
                    {invoiceItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                          No items yet. Click "+ Add Item" to get started.
                        </td>
                      </tr>
                    )}
                    {invoiceItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 !== 0 ? "bg-gray-50" : ""}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            className={`w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-right ${
                              !rowValid[idx] && Number(item.quantity) <= 0 ? "border-red-500" : "border-gray-300"
                            }`}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={`w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-right ${
                              !rowValid[idx] && Number(item.unitPrice) <= 0 ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="0.00"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, "unitPrice", e.target.value === '' ? '' : parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-right"
                            value={item.taxRate}
                            onChange={(e) => updateItem(idx, "taxRate", parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">${(item.amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <button 
                            type="button" 
                            onClick={() => removeItem(idx)} 
                            className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
                            aria-label={`Remove item ${idx + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="w-full mt-4 border border-dashed border-gray-300 p-2.5 rounded-md flex items-center justify-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onClick={addItem}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div> {/* End of Line Items Section */}

            {/* Totals */}
            <div className="mt-6 flex flex-col items-end space-y-1.5">
              <div className="text-sm text-gray-700">Subtotal: <span className="font-medium text-gray-900">${calculateSubtotal().toFixed(2)}</span></div>
              <div className="text-sm text-gray-700">Tax: <span className="font-medium text-gray-900">${calculateTax().toFixed(2)}</span></div>
              <div className="font-semibold text-lg text-gray-900">
                Total Due: ${calculateTotal().toFixed(2)}
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="mt-8">
              <Label htmlFor="notes" className="block mb-1 text-sm font-medium">Notes</Label>
              <textarea id="notes" className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" rows={3} placeholder="Any additional notes for the customer..." />
            </div>
            <div className="mt-4 pb-6"> {/* Padding at the bottom of scrollable content */}
              <Label htmlFor="terms" className="block mb-1 text-sm font-medium">Terms & Conditions</Label>
              <textarea id="terms" className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" rows={3} placeholder="Payment terms, warranty, etc." />
            </div>
          </div> {/* End of Inner wrapper for padding */}
        </div> {/* End of Scrollable Content Area */}

        {/* Actions Footer: Not sticky, part of flex flow */}
        <div className="flex-shrink-0 bg-white border-t px-6 py-4 flex justify-end space-x-3 z-10">
          <DialogClose asChild>
            <button 
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          </DialogClose>
          <button 
            type="submit" 
            disabled={!isFormValid()}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save / Create Invoice
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}