# app/schemas.py
from typing import Optional, List
from pydantic import BaseModel, constr ,Field
from datetime import date, datetime
from decimal import Decimal

# --- Company Schemas ---
class CompanyBase(BaseModel):
    name: str
    logo: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    tan_number: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    authorized_signature_image: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(CompanyBase):
    name: Optional[str] = None # Allow individual fields to be optional for update
    # All other fields are already optional in CompanyBase

class Company(CompanyBase):
    id: int

    class Config:
        from_attributes = True # Updated from orm_mode

# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str
    address: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    tan: Optional[str] = None
    fssai: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    name: Optional[str] = None # Allow individual fields to be optional for update
    # All other fields are already optional in CustomerBase

class Customer(CustomerBase):
    id: int

    class Config:
        from_attributes = True # Updated from orm_mode

# --- LineItem Schemas ---
class LineItemBase(BaseModel):
    mill: Optional[str] = None
    bargain_no: Optional[str] = None
    quality: Optional[str] = None
    quantity_quintals: Decimal
    rate: Decimal
    amount: Decimal # This should ideally be calculated: quantity_quintals * rate

class LineItemCreate(LineItemBase):
    pass

class LineItemUpdate(LineItemBase): # For potential future granular updates
    mill: Optional[str] = None
    bargain_no: Optional[str] = None
    quality: Optional[str] = None
    quantity_quintals: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    amount: Optional[Decimal] = None

class LineItem(LineItemBase):
    id: int
    # delivery_order_id: int # Not usually needed in response if nested under DeliveryOrder

    class Config:
        from_attributes = True # Updated from orm_mode

# --- Charges Schemas ---
class ChargesBase(BaseModel):
    insurance_description: Optional[str] = None
    insurance_amount: Optional[Decimal] = Decimal('0.00')
    penalty_description: Optional[str] = None
    penalty_amount: Optional[Decimal] = Decimal('0.00')
    tds_pct: Optional[Decimal] = None
    tds_amount: Optional[Decimal] = Decimal('0.00')
    gst_pct: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = Decimal('0.00')
    total_invoice_amount: Decimal # This should ideally be calculated

class ChargesCreate(ChargesBase):
    pass

class ChargesUpdate(ChargesBase): # For potential future granular updates
    insurance_description: Optional[str] = None
    insurance_amount: Optional[Decimal] = None
    penalty_description: Optional[str] = None
    penalty_amount: Optional[Decimal] = None
    tds_pct: Optional[Decimal] = None
    tds_amount: Optional[Decimal] = None
    gst_pct: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = None
    total_invoice_amount: Optional[Decimal] = None


class Charges(ChargesBase):
    id: int
    # delivery_order_id: int # Not usually needed in response if nested

    class Config:
        from_attributes = True # Updated from orm_mode

# --- PaymentDetail Schemas ---
class PaymentDetailBase(BaseModel):
    payment_date: date
    utr_no: Optional[str] = None
    utr_amount: Decimal
    adjust_amount: Optional[Decimal] = Decimal('0.00')

class PaymentDetailCreate(PaymentDetailBase):
    pass

class PaymentDetailUpdate(PaymentDetailBase): # For potential future granular updates
    payment_date: Optional[date] = None
    utr_no: Optional[str] = None
    utr_amount: Optional[Decimal] = None
    adjust_amount: Optional[Decimal] = None

class PaymentDetail(PaymentDetailBase):
    id: int
    # delivery_order_id: int # Not usually needed in response if nested
    created_at: datetime

    class Config:
        from_attributes = True # Updated from orm_mode

# --- Remark Schemas ---
class RemarkBase(BaseModel):
    text: str
    sequence: Optional[int] = 0

class RemarkCreate(RemarkBase):
    pass

class RemarkUpdate(RemarkBase): # For potential future granular updates
    text: Optional[str] = None
    sequence: Optional[int] = None

class Remark(RemarkBase):
    id: int
    # delivery_order_id: int # Not usually needed in response if nested
    created_at: datetime

    class Config:
        from_attributes = True # Updated from orm_mode

# --- DeliveryOrder Schemas ---
class DeliveryOrderBase(BaseModel):
    invoice_number: str
    seller_company_id: int
    buyer_customer_id: int
    do_number: Optional[str] = None
    do_date: date = Field(default_factory=date.today) # Provide default for creation
    truck_no: Optional[str] = None
    due_date: Optional[date] = None
    consignee_customer_id: Optional[int] = None

class DeliveryOrderCreate(DeliveryOrderBase):
    line_items: List[LineItemCreate] = []
    charges: Optional[ChargesCreate] = None
    payment_details: List[PaymentDetailCreate] = []
    remarks: List[RemarkCreate] = []

class DeliveryOrderUpdate(BaseModel): # More granular control for updates
    invoice_number: Optional[str] = None
    seller_company_id: Optional[int] = None
    buyer_customer_id: Optional[int] = None
    do_number: Optional[str] = None
    do_date: Optional[date] = None
    truck_no: Optional[str] = None
    due_date: Optional[date] = None
    consignee_customer_id: Optional[int] = None
    # For nested items, we'll handle them in the route.
    # If you want to allow replacing entire lists via PUT:
    line_items: Optional[List[LineItemCreate]] = None
    charges: Optional[ChargesCreate] = None # Or ChargesUpdate if you want to patch charges
    payment_details: Optional[List[PaymentDetailCreate]] = None
    remarks: Optional[List[RemarkCreate]] = None


class DeliveryOrder(DeliveryOrderBase): # Response Model
    id: int
    seller_company: Company # Nested Company object
    buyer_customer: Customer # Nested Customer object
    consignee_customer: Optional[Customer] = None # Nested optional Customer
    line_items: List[LineItem] = []
    charges: Optional[Charges] = None
    payment_details: List[PaymentDetail] = []
    remarks: List[Remark] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # Updated from orm_mode