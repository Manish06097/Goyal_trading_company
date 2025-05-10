// App.jsx
import React, { useState } from 'react';
import { PlusCircle, FileText } from 'lucide-react';

function App() {
  const [invoiceData, setInvoiceData] = useState({
    customer_name: '',
    amount: '',
    items: [{ item_name: '', quantity: '', price: '' }],
    seller: {
      name: 'Shree Balaji Sugar Company',
      address: 'Sangli, Maharashtra',
      phone: '123-456-7890',
      email: 'seller@example.com',
      gstin: 'GSTIN12345',
      pan: 'PAN12345',
      tan: 'TAN12345'
    },
    order: {
      no: 'DO-2025-001',
      date: '2025-04-22',
      truck_no: 'MH-04-XX-1234',
      due_date: '2025-04-30'
    },
    buyer: {
      name: 'Acme Corp',
      address: 'Mumbai, Maharashtra',
      phone: '987-654-3210',
      gstin: 'GSTIN56789',
      tan: 'TAN56789',
      under_194q: 'Yes'
    },
    mill: {
      name: 'XYZ Sugar Mill',
      address: 'Satara, Maharashtra',
      gstin: 'GSTIN98765'
    },
    charges: {
      insurance: '100',
      penalty: '50',
      tds: '1',
      gst: '5',
      gst_amount: '75',
      total: '1225'
    },
    payment: {
      date: '2025-04-25',
      utr_no: 'UTR123456789',
      utr_amount: '1225'
    },
    remarks: []
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (idx, e) => {
    const { name, value } = e.target;
    setInvoiceData((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [name]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setInvoiceData((prev) => ({
      ...prev,
      items: [...prev.items, { item_name: '', quantity: '', price: '' }],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // validation omitted for brevity
    try {
      const res = await fetch('http://localhost:8000/api/invoice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err) {
      console.error(err);
      alert('Invoice generation failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <FileText className="w-6 h-6 text-indigo-600 mr-2" />
          <h1 className="text-xl font-semibold text-gray-800">Invoice Generator</h1>
        </div>
      </header>

      {/* Form Container */}
      <main className="flex-1 flex items-start justify-center py-10 px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl bg-white shadow-lg rounded-2xl p-8 space-y-6"
        >
          {/* Customer & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                Customer Name
              </label>
              <input
                id="customer_name"
                name="customer_name"
                type="text"
                value={invoiceData.customer_name}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Acme Corp"
                required
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Total Amount
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₹</span>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  value={invoiceData.amount}
                  onChange={handleInputChange}
                  className="block w-full pl-7 pr-3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            {invoiceData.items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name</label>
                  <input
                    name="item_name"
                    value={item.item_name}
                    onChange={(e) => handleItemChange(idx, e)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Widget A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, e)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                  <input
                    name="price"
                    type="number"
                    value={item.price}
                    onChange={(e) => handleItemChange(idx, e)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Button */}
          <button
            type="button"
            onClick={addItem}
            className="flex items-center text-indigo-600 hover:text-indigo-800 space-x-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="font-medium">Add Another Item</span>
          </button>

          {/* Submit */}
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Generate Invoice
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default App;
