"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const BillingManagement = () => {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Billing Management</h1>
        <p className="text-muted-foreground">
          View and manage your invoices, payments, and plans
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Button variant="default">New Invoice</Button>
        <div className="flex items-center space-x-2">
          <Input
            type="search"
            placeholder="Search invoice number or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update: [Date | null, Date | null]) => {
              setDateRange(update);
            }}
            isClearable={true}
            placeholderText="Select date range"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Total Outstanding</h3>
          <p className="text-2xl">$10,000</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Paid This Month</h3>
          <p className="text-2xl">$5,000</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold">Overdue Invoices</h3>
          <p className="text-2xl">5</p>
        </div>
      </div>
    </div>
  );
};

export default BillingManagement;