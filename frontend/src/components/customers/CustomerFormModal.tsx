import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/components/ui/input";

interface Customer {
  id: number;
  name?: string;
  address?: string;
  gstin?: string;
  phone?: string;
  tan?: string;
  fssai?: string;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  customerId?: number;
  customer?: Customer;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSaveSuccess, customerId, customer }: CustomerFormModalProps) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [tan, setTan] = useState('');
  const [fssai, setFssai] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    if (isOpen && customer) {
      setName(customer.name || '');
      setAddress(customer.address || '');
      setGstin(customer.gstin || '');
      setPhone(customer.phone || '');
      setTan(customer.tan || '');
      setFssai(customer.fssai || '');
    } else if (isOpen) {
      setName('');
      setAddress('');
      setGstin('');
      setPhone('');
      setTan('');
      setFssai('');
    }
  }, [customer, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const customerData = {
      name,
      address,
      gstin,
      phone,
      tan,
      fssai,
    };

    try {
      console.log('Customer data being sent:', customerData);
      const url = customerId ? `${API_BASE_URL}/customers/${customerId}` : `${API_BASE_URL}/customers/`;
      const method = customerId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        console.log('Customer saved successfully!');
        onClose();
        onSaveSuccess();
      } else {
        throw new Error(`Failed to save customer: ${response.statusText}`);
      }

    } catch (error: any) {
      console.error('Error saving customer:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customerId ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>
            {customerId ? "Modify customer details." : "Create a new customer."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                Name
              </label>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="address" className="text-right">
                Address
              </label>
              <Input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="gstin" className="text-right">
                GSTIN
              </label>
              <Input
                type="text"
                id="gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="phone" className="text-right">
                Phone Number
              </label>
              <Input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="tan" className="text-right">
                TAN
              </label>
              <Input
                type="text"
                id="tan"
                value={tan}
                onChange={(e) => setTan(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="fssai" className="text-right">
                FSSAI
              </label>
              <Input
                type="text"
                id="fssai"
                value={fssai}
                onChange={(e) => setFssai(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          {error && (
            <div className="text-red-500 mt-2">{error}</div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerFormModal;