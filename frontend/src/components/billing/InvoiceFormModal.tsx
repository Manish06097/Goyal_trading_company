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
import { Input } from "@/components/ui/input"; // Assuming you have this
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this
import { Button } from "@/components/ui/button"; // Assuming you have this for consistency

// --- INTERFACES ---
interface Company {
  id: number;
  name?: string;
  // ... other company fields if needed
}

interface Customer {
  id: number;
  name: string;
}

interface InvoiceFormModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface LineItem {
  id: string; // For React key
  mill: string;
  bargain_no: string;
  quality: string;
  quantity_quintals: number | ""; // Allow empty string for input state
  rate: number | ""; // Allow empty string for input state
  amount: number; // Calculated: quantity_quintals * rate
}

interface ChargesState {
  insurance_description: string;
  insurance_amount: number | "";
  penalty_description: string;
  penalty_amount: number | "";
  tds_pct: number | ""; // Percentage, e.g., 1 for 1%
  gst_pct: number | ""; // Percentage, e.g., 5 for 5%
}

interface PaymentDetailItem {
  id: string; // For React key
  payment_date: string;
  utr_no: string;
  utr_amount: number | "";
  adjust_amount: number | "";
}

interface RemarkItem {
  id: string; // For React key
  text: string;
}

const SAME_AS_BUYER_OPTION_VALUE = "___same_as_buyer___"; // Unique value for the option

export function InvoiceFormModal({ open, setOpen }: InvoiceFormModalProps): React.ReactElement {
  // --- STATE ---
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  const [selectedSellerCompanyId, setSelectedSellerCompanyId] = useState<string | undefined>();
  const [selectedBuyerCustomerId, setSelectedBuyerCustomerId] = useState<string | undefined>();
  const [selectedConsigneeCustomerId, setSelectedConsigneeCustomerId] = useState<string | undefined>();
  
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState<string>("");
  const [doNumber, setDoNumber] = useState<string>("");
  const [doDate, setDoDate] = useState<string>("");
  const [truckNo, setTruckNo] = useState<string>("");
  const [poReference, setPoReference] = useState<string>("");

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [lineItemRowValid, setLineItemRowValid] = useState<boolean[]>([]);
  
  const [charges, setCharges] = useState<ChargesState>({
    insurance_description: "",
    insurance_amount: "",
    penalty_description: "",
    penalty_amount: "",
    tds_pct: 1, // Default TDS 1%
    gst_pct: 5, // Default GST 5%
  });

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetailItem[]>([]);
  const [remarks, setRemarks] = useState<RemarkItem[]>([]);

  const lineItemsTbodyRef = useRef<HTMLTableSectionElement>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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
      } finally {
        setIsLoadingCompanies(false);
      }
    }
    fetchCompanies();
  }, [API_BASE_URL]);

  useEffect(() => {
    async function fetchCustomers() {
      setIsLoadingCustomers(true);
      try {
        const res = await fetch(`${API_BASE_URL}/customers/`); // Using the actual endpoint
        if (!res.ok) throw new Error(`Failed to fetch customers: ${res.statusText}`);
        const data: Customer[] = await res.json();
        setCustomers(data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setIsLoadingCustomers(false);
      }
    }
    fetchCustomers();
  }, [API_BASE_URL]);

  // --- HELPER FOR PARSING NUMBER INPUTS ---
  const parseNumericInput = (value: string | number): number | "" => {
    if (value === "") return "";
    const num = parseFloat(String(value));
    return isNaN(num) ? "" : num;
  };
  
  // --- LINE ITEM MANAGEMENT ---
  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      mill: "",
      bargain_no: "",
      quality: "",
      quantity_quintals: 1,
      rate: "",
      amount: 0,
    };
    setLineItems((items) => [...items, newItem]);
    setLineItemRowValid((prev) => [...prev, false]);

    requestAnimationFrame(() => {
      lineItemsTbodyRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      const lastMillInput = lineItemsTbodyRef.current?.querySelector('tr:last-child td:first-child input[type="text"]');
      (lastMillInput as HTMLInputElement)?.focus();
    });
  };

  const removeLineItem = (id: string) => {
    const index = lineItems.findIndex(item => item.id === id);
    if (index === -1) return;
    setLineItems((items) => items.filter((item) => item.id !== id));
    setLineItemRowValid((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = <K extends keyof LineItem>(
    id: string,
    field: K,
    value: string // Input value is always string from e.target.value
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

      const numQuantity = Number(updatedItem.quantity_quintals); // Number("") is 0
      const numRate = Number(updatedItem.rate); // Number("") is 0
      updatedItem.amount = numQuantity * numRate;
      next[index] = updatedItem;

      setLineItemRowValid((prevRowValid) => {
        const nextRowValid = [...prevRowValid];
        nextRowValid[index] = numQuantity > 0 && numRate > 0;
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
  const gstAmount = subtotal * (Number(charges.gst_pct || 0) / 100);
  const tdsAmount = subtotal * (Number(charges.tds_pct || 0) / 100);
  const totalOtherCharges = (Number(charges.insurance_amount) || 0) - (Number(charges.penalty_amount) || 0);
  const totalInvoiceAmount = subtotal + gstAmount - tdsAmount + totalOtherCharges;

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
  const isFormValid = () => {
    if (lineItems.length === 0 || !lineItemRowValid.every((v) => v)) return false;
    if (!selectedSellerCompanyId || !selectedBuyerCustomerId || !effectiveConsigneeId) return false;
    // Add other critical validations here, e.g., date checks
    if (!invoiceDate || !dueDate) return false; // Basic date check
    return true;
  };

  // --- RENDER ---
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-5xl w-full max-h-screen bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 bg-white z-10 pt-6 px-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Create New Invoice</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-1">
            Fill in the details to generate a new invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {/* Section 1: Main Details (Company, Customer, Dates, DO, Truck) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sellerCompany" className="block mb-1 text-sm font-medium">Seller Company</Label>
              <Select value={selectedSellerCompanyId} onValueChange={setSelectedSellerCompanyId}>
                <SelectTrigger id="sellerCompany"><SelectValue placeholder="Select seller company" /></SelectTrigger>
                <SelectContent>
                  {isLoadingCompanies && <SelectItem value="loading-co" disabled>Loading companies...</SelectItem>}
                  {!isLoadingCompanies && companies.length === 0 && <SelectItem value="no-co" disabled>No companies found</SelectItem>}
                  {companies.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name || `Company ${c.id}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="buyerCustomer" className="block mb-1 text-sm font-medium">Buyer Customer</Label>
              <Select value={selectedBuyerCustomerId} onValueChange={setSelectedBuyerCustomerId}>
                <SelectTrigger id="buyerCustomer"><SelectValue placeholder="Select buyer customer" /></SelectTrigger>
                <SelectContent>
                  {isLoadingCustomers && <SelectItem value="loading-cust" disabled>Loading customers...</SelectItem>}
                  {!isLoadingCustomers && customers.length === 0 && <SelectItem value="no-cust" disabled>No customers found</SelectItem>}
                  {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="consigneeCustomer" className="block mb-1 text-sm font-medium">Consignee Customer</Label>
              <Select 
                value={selectedConsigneeCustomerId} 
                onValueChange={setSelectedConsigneeCustomerId}
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
              <Label htmlFor="invoiceDate" className="block mb-1 text-sm font-medium">Invoice Date</Label>
              <Input type="date" id="invoiceDate" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dueDate" className="block mb-1 text-sm font-medium">Due Date</Label>
              <Input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="invoiceNumber" className="block mb-1 text-sm font-medium">Invoice #</Label>
              <Input type="text" id="invoiceNumber" placeholder="Auto-generated" disabled className="bg-gray-100 cursor-not-allowed" />
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
            <div className="lg:col-span-1">
              <Label htmlFor="poReference" className="block mb-1 text-sm font-medium">PO / Reference</Label>
              <Input type="text" id="poReference" value={poReference} onChange={e => setPoReference(e.target.value)} placeholder="Optional: Purchase order #" />
            </div>
          </div>

          {/* Section 2: Line Items */}
          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-2">Line Items</h3>
            <div className="overflow-x-auto border rounded-lg relative">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-[5]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mill</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bargain No</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quality</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Qty (Quintals)</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Rate</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Amount</th>
                    <th className="px-3 py-3 w-12"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200" ref={lineItemsTbodyRef}>
                  {lineItems.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500">No items added.</td></tr>
                  )}
                  {lineItems.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 !== 0 ? "bg-gray-50" : ""}>
                      <td className="px-3 py-2"><Input type="text" placeholder="Mill name" value={item.mill} onChange={(e) => updateLineItem(item.id, "mill", e.target.value)} /></td>
                      <td className="px-3 py-2"><Input type="text" placeholder="Bargain No." value={item.bargain_no} onChange={(e) => updateLineItem(item.id, "bargain_no", e.target.value)} /></td>
                      <td className="px-3 py-2"><Input type="text" placeholder="Quality details" value={item.quality} onChange={(e) => updateLineItem(item.id, "quality", e.target.value)} /></td>
                      <td className="px-3 py-2">
                        <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.quantity_quintals} 
                               onChange={(e) => updateLineItem(item.id, "quantity_quintals", e.target.value)}
                               className={`text-right ${!lineItemRowValid[idx] && Number(item.quantity_quintals) <= 0 ? "border-red-500" : ""}`} />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.rate} 
                               onChange={(e) => updateLineItem(item.id, "rate", e.target.value)}
                               className={`text-right ${!lineItemRowValid[idx] && Number(item.rate) <= 0 ? "border-red-500" : ""}`} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">${(item.amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} aria-label="Remove line item">
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
                <div className="flex justify-between text-sm"><span className="text-gray-600">GST ({charges.gst_pct || 0}%):</span> <span className="font-medium">${gstAmount.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">TDS ({charges.tds_pct || 0}%):</span> <span className="font-medium">-${tdsAmount.toFixed(2)}</span></div>
                <hr className="my-2"/>
                <div className="flex justify-between text-lg font-bold"><span >Total Invoice Amount:</span> <span>${totalInvoiceAmount.toFixed(2)}</span></div>
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
                <Button variant="ghost" size="icon" onClick={() => removePaymentDetail(payment.id)} aria-label="Remove payment detail">
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
                <Button variant="ghost" size="icon" onClick={() => removeRemark(remark.id)} aria-label="Remove remark" className="mt-1">
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
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={!isFormValid()}>
            Save / Create Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}