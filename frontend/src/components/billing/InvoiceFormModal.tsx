import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { X, Plus, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAppToast } from '../../contexts/ToastContext' // Corrected toast import

// --- INTERFACES ---
interface Company {
  id: number;
  name?: string;
}

interface Customer {
  id: number;
  name: string;
}

interface InvoiceFormModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onInvoiceCreated?: () => void;
}

export type { InvoiceFormModalProps };

interface LineItem {
  id: string;
  mill: string;
  bargain_no: string;
  quality: string;
  quantity_quintals: number | "";
  rate: number | "";
  amount: number;
}

interface ChargesState {
  insurance_description: string;
  insurance_amount: number | "";
  penalty_description: string;
  penalty_amount: number | "";
  tds_pct: number | "";
  gst_pct: number | "";
}

interface PaymentDetailItem {
  id: string;
  payment_date: string;
  utr_no: string;
  utr_amount: number | "";
  adjust_amount: number | "";
}

interface RemarkItem {
  id: string;
  text: string;
}

const SAME_AS_BUYER_OPTION_VALUE = "___same_as_buyer___";

const initialLineItem: Omit<LineItem, 'id' | 'amount'> = {
  mill: "",
  bargain_no: "",
  quality: "",
  quantity_quintals: 1,
  rate: "",
};

const initialChargesState: ChargesState = {
  insurance_description: "",
  insurance_amount: "",
  penalty_description: "",
  penalty_amount: "",
  tds_pct: 1,
  gst_pct: 5,
};


export function InvoiceFormModal({ open, setOpen, onInvoiceCreated }: InvoiceFormModalProps): React.ReactElement {
  const { addToast } = useAppToast();

  // --- STATE ---
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [invoiceNumberInput, setInvoiceNumberInput] = useState<string>("");
  const [selectedSellerCompanyId, setSelectedSellerCompanyId] = useState<string | undefined>();
  const [selectedBuyerCustomerId, setSelectedBuyerCustomerId] = useState<string | undefined>();
  const [selectedConsigneeCustomerId, setSelectedConsigneeCustomerId] = useState<string | undefined>();
  
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState<string>("");
  const [doNumber, setDoNumber] = useState<string>("");
  const [doDate, setDoDate] = useState<string>("");
  const [truckNo, setTruckNo] = useState<string>("");
  // const [poReference, setPoReference] = useState<string>(""); // Not in backend schema

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [lineItemRowValid, setLineItemRowValid] = useState<boolean[]>([]);
  
  const [charges, setCharges] = useState<ChargesState>({...initialChargesState});
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetailItem[]>([]);
  const [remarks, setRemarks] = useState<RemarkItem[]>([]);

  const lineItemsTbodyRef = useRef<HTMLTableSectionElement>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const resetForm = useCallback(() => {
    setInvoiceNumberInput("");
    setSelectedSellerCompanyId(undefined);
    setSelectedBuyerCustomerId(undefined);
    setSelectedConsigneeCustomerId(undefined);
    setInvoiceDate(new Date().toISOString().substring(0, 10));
    setDueDate("");
    setDoNumber("");
    setDoDate("");
    setTruckNo("");
    setLineItems([]);
    setLineItemRowValid([]);
    setCharges({...initialChargesState});
    setPaymentDetails([]);
    setRemarks([]);
  }, []);


  const addLineItem = useCallback(() => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      ...initialLineItem,
      amount: 0,
    };
    setLineItems((items) => [...items, newItem]);
    setLineItemRowValid((prev) => [...prev, false]);

    requestAnimationFrame(() => {
      lineItemsTbodyRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      const lastMillInput = lineItemsTbodyRef.current?.querySelector('tr:last-child td:first-child input[type="text"]');
      (lastMillInput as HTMLInputElement)?.focus();
    });
  }, []);

  // --- EFFECTS ---
  useEffect(() => {
    if (!selectedBuyerCustomerId && selectedConsigneeCustomerId === SAME_AS_BUYER_OPTION_VALUE) {
      setSelectedConsigneeCustomerId(undefined);
    }
  }, [selectedBuyerCustomerId, selectedConsigneeCustomerId]);

  useEffect(() => {
    async function fetchCompanies() {
      setIsLoadingCompanies(true);
      try {
        const res = await fetch(`${API_BASE_URL}/companies/`);
        if (!res.ok) throw new Error(`Failed to fetch companies: ${res.statusText}`);
        const data: Company[] = await res.json();
        setCompanies(data);
      } catch (err) {
        console.error("Error fetching companies:", err);
        addToast("Could not load companies.", 'error');
      } finally {
        setIsLoadingCompanies(false);
      }
    }
    if (open) fetchCompanies();
  }, [API_BASE_URL, open, addToast]);

  useEffect(() => {
    async function fetchCustomers() {
      setIsLoadingCustomers(true);
      try {
        const res = await fetch(`${API_BASE_URL}/customers/`);
        if (!res.ok) throw new Error(`Failed to fetch customers: ${res.statusText}`);
        const data: Customer[] = await res.json();
        setCustomers(data);
      } catch (err) {
        console.error("Error fetching customers:", err);
        addToast("Could not load customers.", 'error');
      } finally {
        setIsLoadingCustomers(false);
      }
    }
    if (open) fetchCustomers();
  }, [API_BASE_URL, open, addToast]);
  
  useEffect(() => {
    if (open && lineItems.length === 0) {
        addLineItem();
    }
    if (!open) { 
        resetForm();
    }
  }, [open, lineItems.length, addLineItem, resetForm]);


  // --- HELPER FOR PARSING NUMBER INPUTS ---
  const parseNumericInput = (value: string | number): number | "" => {
    if (value === "" || value === null || value === undefined) return "";
    const num = parseFloat(String(value));
    return isNaN(num) ? "" : num;
  };
  
  // --- LINE ITEM MANAGEMENT ---
  // addLineItem moved up and wrapped in useCallback

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) {
        addToast("At least one line item is required.", 'error'); // Or a different type like 'warning'
        return;
    }
    const index = lineItems.findIndex(item => item.id === id);
    if (index === -1) return;
    setLineItems((items) => items.filter((item) => item.id !== id));
    setLineItemRowValid((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = <K extends keyof LineItem>(
    id: string,
    field: K,
    value: string
  ) => {
    setLineItems((items) => {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return items;

      const next = [...items];
      const updatedItem = { ...next[index] };
      
      if (field === "quantity_quintals" || field === "rate") {
        updatedItem[field] = parseNumericInput(value) as LineItem[K];
      } else {
        updatedItem[field] = value as LineItem[K];
      }

      const numQuantity = Number(updatedItem.quantity_quintals);
      const numRate = Number(updatedItem.rate);
      updatedItem.amount = numQuantity * numRate;
      next[index] = updatedItem;

      setLineItemRowValid((prevRowValid) => {
        const nextRowValid = [...prevRowValid];
        nextRowValid[index] = numQuantity > 0 && numRate > 0 && 
                              !!updatedItem.mill && !!updatedItem.bargain_no && !!updatedItem.quality;
        return nextRowValid;
      });
      return next;
    });
  };

  // --- CHARGES MANAGEMENT ---
  const handleChargeChange = <K extends keyof ChargesState>(field: K, value: string) => {
    let processedValue: string | number = value;
    if (field.endsWith('_amount') || field.endsWith('_pct')) {
        processedValue = parseNumericInput(value);
    }
    setCharges(prev => ({ ...prev, [field]: processedValue as ChargesState[K] }));
  };
  
  // --- PAYMENT DETAILS MANAGEMENT ---
  const addPaymentDetail = () => {
    setPaymentDetails(prev => [...prev, { 
      id: Date.now().toString(), 
      payment_date: new Date().toISOString().substring(0,10), 
      utr_no: "", 
      utr_amount: "", 
      adjust_amount: "" 
    }]);
  };

  const removePaymentDetail = (id: string) => {
    setPaymentDetails(prev => prev.filter(item => item.id !== id));
  };

  const updatePaymentDetail = <K extends keyof PaymentDetailItem>(id: string, field: K, value: string) => {
    setPaymentDetails(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item };
        if (field === "utr_amount" || field === "adjust_amount") {
          updatedItem[field] = parseNumericInput(value) as PaymentDetailItem[K];
        } else {
          updatedItem[field] = value as PaymentDetailItem[K];
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // --- REMARKS MANAGEMENT ---
  const addRemark = () => {
    setRemarks(prev => [...prev, { id: Date.now().toString(), text: "" }]);
  };

  const removeRemark = (id: string) => {
    setRemarks(prev => prev.filter(item => item.id !== id));
  };

  const updateRemark = (id: string, text: string) => {
    setRemarks(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  // --- CALCULATIONS & DERIVED STATE ---
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const gstAmountCalculated = subtotal * (Number(charges.gst_pct || 0) / 100);
  const tdsAmountCalculated = subtotal * (Number(charges.tds_pct || 0) / 100);
  const totalOtherCharges = (Number(charges.insurance_amount) || 0) - (Number(charges.penalty_amount) || 0);
  const totalInvoiceAmountCalculated = subtotal + gstAmountCalculated - tdsAmountCalculated + totalOtherCharges;

  const getEffectiveConsigneeId = (): string | undefined => {
    if (selectedConsigneeCustomerId === SAME_AS_BUYER_OPTION_VALUE) {
      return selectedBuyerCustomerId;
    }
    return selectedConsigneeCustomerId;
  };
  const effectiveConsigneeId = getEffectiveConsigneeId();

  const buyerCustomerName = selectedBuyerCustomerId && !isLoadingCustomers
    ? customers.find(c => String(c.id) === selectedBuyerCustomerId)?.name
    : "";

  // --- FORM VALIDATION ---
  const isFormValid = (): boolean => {
    if (!invoiceNumberInput.trim()) return false;
    if (lineItems.length === 0 || !lineItemRowValid.every((v) => v)) return false;
    if (!selectedSellerCompanyId || !selectedBuyerCustomerId || !effectiveConsigneeId) return false;
    if (!invoiceDate || !dueDate) return false;
    return true;
  };

  // --- FORM SUBMISSION ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid()) {
      addToast("Please fill all required fields correctly.", 'error');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);

    const deliveryOrderPayload = {
      invoice_number: invoiceNumberInput.trim(),
      seller_company_id: Number(selectedSellerCompanyId),
      buyer_customer_id: Number(selectedBuyerCustomerId),
      consignee_customer_id: effectiveConsigneeId ? Number(effectiveConsigneeId) : null,
      invoice_date: invoiceDate,
      due_date: dueDate,
      do_number: doNumber || null,
      do_date: doDate || null,
      truck_no: truckNo || null,
      line_items: lineItems.map(item => ({
        mill: item.mill,
        bargain_no: item.bargain_no,
        quality: item.quality,
        quantity_quintals: String(item.quantity_quintals || "0"),
        rate: String(item.rate || "0"),
        amount: String(item.amount || "0"),
      })),
      charges: {
        insurance_description: charges.insurance_description || null,
        insurance_amount: String(charges.insurance_amount || "0.00"),
        penalty_description: charges.penalty_description || null,
        penalty_amount: String(charges.penalty_amount || "0.00"),
        tds_pct: String(charges.tds_pct || "0"),
        gst_pct: String(charges.gst_pct || "0"),
        tds_amount: String(tdsAmountCalculated.toFixed(2)),
        gst_amount: String(gstAmountCalculated.toFixed(2)),
        total_invoice_amount: String(totalInvoiceAmountCalculated.toFixed(2)),
      },
      payment_details: paymentDetails.map(pd => ({
        payment_date: pd.payment_date,
        utr_no: pd.utr_no,
        utr_amount: String(pd.utr_amount || "0.00"),
        adjust_amount: String(pd.adjust_amount || "0.00"),
      })),
      remarks: remarks.map((remark, index) => ({
        text: remark.text,
        sequence: index + 1,
      })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/delivery_orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deliveryOrderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "An unknown error occurred during submission." }));
        const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
        console.error("Backend error details:", errorData); // Log the actual error object
        throw new Error(errorMessage);
      }
      
      addToast("Delivery Order created successfully!", 'success');
      setOpen(false); // This will trigger the resetForm in the useEffect for 'open'
      if (onInvoiceCreated) {
        onInvoiceCreated();
      }
    } catch (error) {
      console.error("Failed to create delivery order:", error); // Log the caught error
      addToast((error as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER ---
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen); // Let parent control open state
        // Reset is now handled by useEffect on 'open' prop change
    }}>
      <DialogContent className="sm:max-w-5xl w-full max-h-screen bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
            <DialogHeader className="flex-shrink-0 bg-white z-10 pt-6 px-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">Create New Delivery Order</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
                Fill in the details to generate a new delivery order.
            </DialogDescription>
            </DialogHeader>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {/* Section 1: Main Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="invoiceNumberInput" className="block mb-1 text-sm font-medium">Invoice #*</Label>
                  <Input 
                    type="text" 
                    id="invoiceNumberInput" 
                    value={invoiceNumberInput}
                    onChange={e => setInvoiceNumberInput(e.target.value)}
                    placeholder="Enter unique invoice number" 
                    required 
                  />
                </div>
                <div>
                <Label htmlFor="sellerCompany" className="block mb-1 text-sm font-medium">Seller Company*</Label>
                <Select value={selectedSellerCompanyId} onValueChange={setSelectedSellerCompanyId} required>
                    <SelectTrigger id="sellerCompany"><SelectValue placeholder="Select seller company" /></SelectTrigger>
                    <SelectContent>
                    {isLoadingCompanies && <SelectItem value="loading-co" disabled>Loading companies...</SelectItem>}
                    {!isLoadingCompanies && companies.length === 0 && <SelectItem value="no-co" disabled>No companies found</SelectItem>}
                    {companies.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name || `Company ${c.id}`}</SelectItem>)}
                    </SelectContent>
                </Select>
                </div>
                <div>
                <Label htmlFor="buyerCustomer" className="block mb-1 text-sm font-medium">Buyer Customer*</Label>
                <Select value={selectedBuyerCustomerId} onValueChange={setSelectedBuyerCustomerId} required>
                    <SelectTrigger id="buyerCustomer"><SelectValue placeholder="Select buyer customer" /></SelectTrigger>
                    <SelectContent>
                    {isLoadingCustomers && <SelectItem value="loading-cust" disabled>Loading customers...</SelectItem>}
                    {!isLoadingCustomers && customers.length === 0 && <SelectItem value="no-cust" disabled>No customers found</SelectItem>}
                    {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                </div>
                <div>
                <Label htmlFor="consigneeCustomer" className="block mb-1 text-sm font-medium">Consignee Customer*</Label>
                <Select 
                    value={selectedConsigneeCustomerId} 
                    onValueChange={setSelectedConsigneeCustomerId}
                    required
                >
                    <SelectTrigger id="consigneeCustomer">
                    <SelectValue placeholder="Select consignee" />
                    </SelectTrigger>
                    <SelectContent>
                    {isLoadingCustomers && <SelectItem value="loading-consignee" disabled>Loading customers...</SelectItem>}
                    {!isLoadingCustomers && customers.length === 0 && <SelectItem value="no-cust-consignee" disabled>No customers found</SelectItem>}
                    {!isLoadingCustomers && customers.length > 0 && (
                        <>
                        <SelectItem
                            value={SAME_AS_BUYER_OPTION_VALUE}
                            disabled={!selectedBuyerCustomerId}
                        >
                            {selectedBuyerCustomerId && buyerCustomerName
                            ? `Same as Buyer: ${buyerCustomerName}`
                            : "Same as Buyer (Select Buyer first)"}
                        </SelectItem>
                        {customers.map((c) => (
                            <SelectItem key={`consignee-${c.id}`} value={String(c.id)}>
                            {c.name}
                            </SelectItem>
                        ))}
                        </>
                    )}
                    </SelectContent>
                </Select>
                </div>
                <div>
                <Label htmlFor="invoiceDate" className="block mb-1 text-sm font-medium">Invoice Date*</Label>
                <Input type="date" id="invoiceDate" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required/>
                </div>
                <div>
                <Label htmlFor="dueDate" className="block mb-1 text-sm font-medium">Due Date*</Label>
                <Input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} required/>
                </div>
                <div>
                <Label htmlFor="doNumber" className="block mb-1 text-sm font-medium">DO Number</Label>
                <Input type="text" id="doNumber" value={doNumber} onChange={e => setDoNumber(e.target.value)} placeholder="e.g. DO-XYZ-789" />
                </div>
                <div>
                <Label htmlFor="doDate" className="block mb-1 text-sm font-medium">DO Date</Label>
                <Input type="date" id="doDate" value={doDate} onChange={e => setDoDate(e.target.value)} />
                </div>
                <div>
                <Label htmlFor="truckNo" className="block mb-1 text-sm font-medium">Truck No</Label>
                <Input type="text" id="truckNo" value={truckNo} onChange={e => setTruckNo(e.target.value)} placeholder="e.g. MH01AB1234" />
                </div>
            </div>

            {/* Section 2: Line Items */}
            <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2">Line Items*</h3>
                <div className="overflow-x-auto border rounded-lg relative">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-[5]">
                    <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mill*</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bargain No*</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quality*</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Qty (Quintals)*</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Rate*</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Amount</th>
                        <th className="px-3 py-3 w-12"><span className="sr-only">Remove</span></th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200" ref={lineItemsTbodyRef}>
                    {lineItems.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500">No items added. At least one item is required.</td></tr>
                    )}
                    {lineItems.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 !== 0 ? "bg-gray-50" : ""}>
                        <td className="px-3 py-2"><Input type="text" placeholder="Mill name" value={item.mill} onChange={(e) => updateLineItem(item.id, "mill", e.target.value)} required /></td>
                        <td className="px-3 py-2"><Input type="text" placeholder="Bargain No." value={item.bargain_no} onChange={(e) => updateLineItem(item.id, "bargain_no", e.target.value)} required/></td>
                        <td className="px-3 py-2"><Input type="text" placeholder="Quality details" value={item.quality} onChange={(e) => updateLineItem(item.id, "quality", e.target.value)} required/></td>
                        <td className="px-3 py-2">
                            <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={item.quantity_quintals} 
                                   onChange={(e) => updateLineItem(item.id, "quantity_quintals", e.target.value)}
                                   className={`text-right ${!lineItemRowValid[idx] && Number(item.quantity_quintals) <= 0 ? "border-red-500" : ""}`} required/>
                        </td>
                        <td className="px-3 py-2">
                            <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={item.rate} 
                                   onChange={(e) => updateLineItem(item.id, "rate", e.target.value)}
                                   className={`text-right ${!lineItemRowValid[idx] && Number(item.rate) <= 0 ? "border-red-500" : ""}`} required/>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">${(item.amount || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} aria-label="Remove line item" disabled={lineItems.length <= 1}>
                            <X className="h-4 w-4 text-gray-400 hover:text-red-600" />
                            </Button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
                <Button type="button" variant="outline" className="w-full mt-3" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" /> Add Line Item
                </Button>
            </div>

            {/* Section 3: Charges & Totals */}
            <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold mb-2">Charges</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="insuranceDesc">Insurance Description</Label>
                            <Input id="insuranceDesc" value={charges.insurance_description} onChange={e => handleChargeChange('insurance_description', e.target.value)} placeholder="e.g. Transit Insurance"/>
                        </div>
                        <div>
                            <Label htmlFor="insuranceAmount">Insurance Amount</Label>
                            <Input type="number" id="insuranceAmount" value={charges.insurance_amount} onChange={e => handleChargeChange('insurance_amount', e.target.value)} placeholder="0.00" className="text-right" />
                        </div>
                        <div>
                            <Label htmlFor="penaltyDesc">Penalty Description (Optional)</Label>
                            <Input id="penaltyDesc" value={charges.penalty_description} onChange={e => handleChargeChange('penalty_description', e.target.value)} placeholder="e.g. Late Fee"/>
                        </div>
                        <div>
                            <Label htmlFor="penaltyAmount">Penalty Amount</Label>
                            <Input type="number" id="penaltyAmount" value={charges.penalty_amount} onChange={e => handleChargeChange('penalty_amount', e.target.value)} placeholder="0.00" className="text-right" />
                        </div>
                        <div>
                            <Label htmlFor="gstPct">GST %</Label>
                            <Input type="number" id="gstPct" value={charges.gst_pct} onChange={e => handleChargeChange('gst_pct', e.target.value)} placeholder="e.g. 5" className="text-right" />
                        </div>
                        <div>
                            <Label htmlFor="tdsPct">TDS %</Label>
                            <Input type="number" id="tdsPct" value={charges.tds_pct} onChange={e => handleChargeChange('tds_pct', e.target.value)} placeholder="e.g. 1" className="text-right" />
                        </div>
                    </div>
                </div>
                <div className="md:col-span-1 space-y-2 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-right">Summary</h3>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span> <span className="font-medium">${subtotal.toFixed(2)}</span></div>
                    {Number(charges.insurance_amount) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">{charges.insurance_description || 'Insurance'}:</span> <span className="font-medium">${Number(charges.insurance_amount).toFixed(2)}</span></div>}
                    {Number(charges.penalty_amount) > 0 && <div className="flex justify-between text-sm text-red-600"><span >{charges.penalty_description || 'Penalty'}:</span> <span className="font-medium">-${Number(charges.penalty_amount).toFixed(2)}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-gray-600">GST ({charges.gst_pct || 0}%):</span> <span className="font-medium">${gstAmountCalculated.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">TDS ({charges.tds_pct || 0}%):</span> <span className="font-medium">-${tdsAmountCalculated.toFixed(2)}</span></div>
                    <hr className="my-2"/>
                    <div className="flex justify-between text-lg font-bold"><span >Total Invoice Amount:</span> <span>${totalInvoiceAmountCalculated.toFixed(2)}</span></div>
                </div>
            </div>
            
            {/* Section 4: Payment Details */}
            <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2">Payment Details (Advances/Part-payments)</h3>
                {paymentDetails.map((payment, idx) => (
                <div key={payment.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 mb-3 p-3 border rounded-md items-end">
                    <div>
                    <Label htmlFor={`paymentDate-${idx}`}>Payment Date</Label>
                    <Input type="date" id={`paymentDate-${idx}`} value={payment.payment_date} onChange={e => updatePaymentDetail(payment.id, "payment_date", e.target.value)} />
                    </div>
                    <div>
                    <Label htmlFor={`utrNo-${idx}`}>UTR No.</Label>
                    <Input type="text" id={`utrNo-${idx}`} value={payment.utr_no} onChange={e => updatePaymentDetail(payment.id, "utr_no", e.target.value)} placeholder="UTR Number"/>
                    </div>
                    <div>
                    <Label htmlFor={`utrAmount-${idx}`}>UTR Amount</Label>
                    <Input type="number" id={`utrAmount-${idx}`} value={payment.utr_amount} onChange={e => updatePaymentDetail(payment.id, "utr_amount", e.target.value)} placeholder="0.00" className="text-right"/>
                    </div>
                    <div>
                    <Label htmlFor={`adjustAmount-${idx}`}>Adjust Amount</Label>
                    <Input type="number" id={`adjustAmount-${idx}`} value={payment.adjust_amount} onChange={e => updatePaymentDetail(payment.id, "adjust_amount", e.target.value)} placeholder="0.00" className="text-right"/>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePaymentDetail(payment.id)} aria-label="Remove payment detail">
                    <X className="h-4 w-4 text-gray-400 hover:text-red-600" />
                    </Button>
                </div>
                ))}
                <Button type="button" variant="outline" className="w-full mt-1" onClick={addPaymentDetail}>
                <Plus className="h-4 w-4 mr-2" /> Add Payment Detail
                </Button>
            </div>

            {/* Section 5: Remarks */}
            <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2">Remarks</h3>
                {remarks.map((remark, idx) => (
                <div key={remark.id} className="flex gap-3 mb-2 items-start">
                    <Textarea 
                    value={remark.text} 
                    onChange={e => updateRemark(remark.id, e.target.value)} 
                    placeholder={`Remark ${idx + 1}`}
                    rows={2}
                    className="flex-grow"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRemark(remark.id)} aria-label="Remove remark" className="mt-1">
                    <X className="h-4 w-4 text-gray-400 hover:text-red-600" />
                    </Button>
                </div>
                ))}
                <Button type="button" variant="outline" className="w-full mt-1" onClick={addRemark}>
                <Plus className="h-4 w-4 mr-2" /> Add Remark
                </Button>
            </div>
            </div> {/* End of Scrollable Content Area */}

            {/* Actions Footer */}
            <div className="flex-shrink-0 bg-white border-t px-6 py-4 flex justify-end space-x-3 z-10">
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setOpen(false) } disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={!isFormValid() || isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Save Delivery Order"}
            </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}