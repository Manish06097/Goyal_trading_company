from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .database import Base

class Bill(Base):
    __tablename__ = "bills"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("BillItem", back_populates="bill", cascade="all, delete")

class BillItem(Base):
    __tablename__ = "bill_items"
    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id"))
    item_name = Column(String)
    quantity = Column(Integer)
    price = Column(Numeric(10, 2))

    bill = relationship("Bill", back_populates="items")

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    logo = Column(String)
    gst_number = Column(String)
    pan_number = Column(String)
    tan_number = Column(String)
    address = Column(String)
    phone_number = Column(String)
    email = Column(String)
    authorized_signature_image = Column(String)
