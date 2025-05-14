# ./models.py

from sqlalchemy import (
    Column, Integer, String, Numeric, ForeignKey, DateTime, Date, func, UniqueConstraint,
    ForeignKeyConstraint # Added ForeignKeyConstraint in case it's needed, though not for this fix
)
from sqlalchemy.orm import relationship, backref # backref is not used in my previous example, but good to have if you use it elsewhere
from .database import Base # Assuming database.py is in the same directory

# --- Your Existing Models (slightly modified for relationships) ---
class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    logo = Column(String)
    gst_number = Column(String)
    pan_number = Column(String)
    tan_number = Column(String)
    address = Column(String)
    phone_number = Column(String)
    email = Column(String)
    authorized_signature_image = Column(String)

    # Relationship to DeliveryOrders where this company is the seller
    delivery_orders_as_seller = relationship(
        "DeliveryOrder",
        back_populates="seller_company",
        foreign_keys="[DeliveryOrder.seller_company_id]"
    )

    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}')>"

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String)
    gstin = Column(String)
    phone = Column(String)
    tan = Column(String)
    fssai = Column(String)

    # Relationship to DeliveryOrders where this customer is the buyer
    delivery_orders_as_buyer = relationship(
        "DeliveryOrder",
        back_populates="buyer_customer",
        foreign_keys="[DeliveryOrder.buyer_customer_id]"
    )
    # Relationship to DeliveryOrders where this customer is the consignee
    delivery_orders_as_consignee = relationship(
        "DeliveryOrder",
        back_populates="consignee_customer",
        foreign_keys="[DeliveryOrder.consignee_customer_id]"
    )

    def __repr__(self):
        return f"<Customer(id={self.id}, name='{self.name}')>"

# --- New Invoice/Delivery Order System Models ---

class DeliveryOrder(Base):
    __tablename__ = "delivery_orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    invoice_number = Column(String, nullable=False, index=True)

    seller_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    buyer_customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    do_number = Column(String, nullable=True, index=True)
    do_date = Column(Date, nullable=False, default=func.current_date()) # Ensure Date is imported
    truck_no = Column(String)
    due_date = Column(Date) # Ensure Date is imported

    consignee_customer_id = Column(
        Integer,
        ForeignKey("customers.id" # Optionally name the FK constraint here: , name="fk_delivery_orders_consignee_customer_id"
                  ),
        nullable=True
    )

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    seller_company = relationship(
        "Company",
        back_populates="delivery_orders_as_seller",
        foreign_keys=[seller_company_id]
    )
    buyer_customer = relationship(
        "Customer",
        back_populates="delivery_orders_as_buyer",
        foreign_keys=[buyer_customer_id]
    )
    consignee_customer = relationship(
        "Customer",
        back_populates="delivery_orders_as_consignee",
        foreign_keys=[consignee_customer_id] # Removed problematic _constraint_name argument
    )

    line_items = relationship("LineItem", back_populates="delivery_order", cascade="all, delete-orphan")
    charges = relationship("Charges", uselist=False, back_populates="delivery_order", cascade="all, delete-orphan")
    payment_details = relationship("PaymentDetail", back_populates="delivery_order", cascade="all, delete-orphan")
    remarks = relationship("Remark", back_populates="delivery_order", cascade="all, delete-orphan", order_by="Remark.sequence")

    __table_args__ = (UniqueConstraint('invoice_number', 'seller_company_id', name='uq_invoice_number_seller'),)

    def __repr__(self):
        return f"<DeliveryOrder(id={self.id}, invoice_number='{self.invoice_number}')>"

class LineItem(Base):
    __tablename__ = "line_items"
    id = Column(Integer, primary_key=True, index=True)
    delivery_order_id = Column(Integer, ForeignKey("delivery_orders.id"), nullable=False)

    mill = Column(String)
    bargain_no = Column(String)
    quality = Column(String)
    quantity_quintals = Column(Numeric(10, 2), nullable=False)
    rate = Column(Numeric(10, 2), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    delivery_order = relationship("DeliveryOrder", back_populates="line_items")

    def __repr__(self):
        return f"<LineItem(id={self.id}, delivery_order_id={self.delivery_order_id}, quantity={self.quantity_quintals})>"

class Charges(Base):
    __tablename__ = "charges"
    id = Column(Integer, primary_key=True, index=True)
    delivery_order_id = Column(Integer, ForeignKey("delivery_orders.id"), nullable=False, unique=True)

    insurance_description = Column(String)
    insurance_amount = Column(Numeric(10, 2), default=0.0)
    penalty_description = Column(String)
    penalty_amount = Column(Numeric(10, 2), default=0.0)
    tds_pct = Column(Numeric(5, 2))
    tds_amount = Column(Numeric(10, 2), default=0.0)
    gst_pct = Column(Numeric(5, 2))
    gst_amount = Column(Numeric(10, 2), default=0.0)
    total_invoice_amount = Column(Numeric(14, 2), nullable=False)

    delivery_order = relationship("DeliveryOrder", back_populates="charges")

    def __repr__(self):
        return f"<Charges(id={self.id}, delivery_order_id={self.delivery_order_id}, total_invoice_amount={self.total_invoice_amount})>"

class PaymentDetail(Base):
    __tablename__ = "payment_details"
    id = Column(Integer, primary_key=True, index=True)
    delivery_order_id = Column(Integer, ForeignKey("delivery_orders.id"), nullable=False)

    payment_date = Column(Date, nullable=False) # Ensure Date is imported
    utr_no = Column(String)
    utr_amount = Column(Numeric(12, 2), nullable=False)
    adjust_amount = Column(Numeric(10, 2), default=0.0)

    created_at = Column(DateTime, default=func.now())

    delivery_order = relationship("DeliveryOrder", back_populates="payment_details")

    def __repr__(self):
        return f"<PaymentDetail(id={self.id}, delivery_order_id={self.delivery_order_id}, utr_amount={self.utr_amount})>"

class Remark(Base):
    __tablename__ = "remarks"
    id = Column(Integer, primary_key=True, index=True)
    delivery_order_id = Column(Integer, ForeignKey("delivery_orders.id"), nullable=False)

    text = Column(String, nullable=False)
    sequence = Column(Integer, default=0)

    created_at = Column(DateTime, default=func.now())

    delivery_order = relationship("DeliveryOrder", back_populates="remarks")

    def __repr__(self):
        return f"<Remark(id={self.id}, delivery_order_id={self.delivery_order_id}, sequence={self.sequence})>"