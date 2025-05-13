from typing import Optional
from pydantic import BaseModel

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
    name: Optional[str] = None
    logo: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    tan_number: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    authorized_signature_image: Optional[str] = None

class Company(CompanyBase):
    id: int

    class Config:
        orm_mode = True

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
    name: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    tan: Optional[str] = None
    fssai: Optional[str] = None

class Customer(CustomerBase):
    id: int

    class Config:
        orm_mode = True