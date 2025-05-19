# app/routes.py
import os
import uuid
import logging
import shutil
from io import BytesIO
from typing import List # Ensure List is imported
from datetime import date, datetime

from fastapi import APIRouter, Request, Depends, HTTPException, status, UploadFile, File, Body
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session, joinedload # Import joinedload for eager loading
from weasyprint import HTML

from . import models, schemas, database # Assuming models and schemas are in the same directory level

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
templates = Jinja2Templates(directory="app/templates") # Make sure this path is correct

# Directory to store uploaded images
IMAGE_DIR = "static/images" # Adjusted path relative to where FastAPI serves static files
# Ensure this directory exists or is created by your app startup logic or deployment

# --- Dependency ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Helper Functions ---
def get_company_or_404(db: Session, company_id: int):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company with id {company_id} not found")
    return company

def get_customer_or_404(db: Session, customer_id: int):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer with id {customer_id} not found")
    return customer

def get_delivery_order_or_404(db: Session, delivery_order_id: int, eager_load: bool = False):
    query = db.query(models.DeliveryOrder)
    if eager_load: # Eager load related objects for read/update operations
        query = query.options(
            joinedload(models.DeliveryOrder.seller_company),
            joinedload(models.DeliveryOrder.buyer_customer),
            joinedload(models.DeliveryOrder.consignee_customer),
            joinedload(models.DeliveryOrder.line_items),
            joinedload(models.DeliveryOrder.charges),
            joinedload(models.DeliveryOrder.payment_details),
            joinedload(models.DeliveryOrder.remarks)
        )
    delivery_order = query.filter(models.DeliveryOrder.id == delivery_order_id).first()
    if not delivery_order:
        raise HTTPException(status_code=404, detail=f"Delivery Order with id {delivery_order_id} not found")
    return delivery_order

# --- Ping ---
@router.get("/ping")
def ping():
    return {"message": "pong"}

# --- Company Routes ---
@router.post("/companies/", response_model=schemas.Company, status_code=status.HTTP_201_CREATED)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    # Check for uniqueness if necessary (e.g., company name)
    existing_company = db.query(models.Company).filter(models.Company.name == company.name).first()
    if existing_company:
        raise HTTPException(status_code=400, detail="Company with this name already exists")
    db_company = models.Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/companies/", response_model=List[schemas.Company])
def read_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    companies = db.query(models.Company).offset(skip).limit(limit).all()
    return companies

@router.get("/companies/{company_id}", response_model=schemas.Company)
def read_company(company_id: int, db: Session = Depends(get_db)):
    return get_company_or_404(db, company_id)

@router.put("/companies/{company_id}", response_model=schemas.Company)
def update_company(company_id: int, company_update: schemas.CompanyUpdate, db: Session = Depends(get_db)):
    db_company = get_company_or_404(db, company_id)

    update_data = company_update.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != db_company.name:
        existing_company = db.query(models.Company).filter(models.Company.name == update_data["name"]).first()
        if existing_company and existing_company.id != company_id:
            raise HTTPException(status_code=400, detail="Another company with this name already exists")

    for key, value in update_data.items():
        setattr(db_company, key, value)

    db.commit()
    db.refresh(db_company)
    return db_company

@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int, db: Session = Depends(get_db)):
    db_company = get_company_or_404(db, company_id)
    # Check if company is used in any delivery orders
    if db.query(models.DeliveryOrder).filter(models.DeliveryOrder.seller_company_id == company_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete company. It is associated with existing delivery orders.")
    db.delete(db_company)
    db.commit()
    return None # Or return a confirmation message if preferred over 204

# --- Customer Routes ---
@router.post("/customers/", response_model=schemas.Customer, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    db_customer = models.Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/customers/", response_model=List[schemas.Customer])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    customers = db.query(models.Customer).offset(skip).limit(limit).all()
    return customers

@router.get("/customers/{customer_id}", response_model=schemas.Customer)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    return get_customer_or_404(db, customer_id)

@router.put("/customers/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: int, customer_update: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    db_customer = get_customer_or_404(db, customer_id)
    update_data = customer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_customer, key, value)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    db_customer = get_customer_or_404(db, customer_id)
    # Check if customer is used as buyer or consignee
    if db.query(models.DeliveryOrder).filter(
        (models.DeliveryOrder.buyer_customer_id == customer_id) |
        (models.DeliveryOrder.consignee_customer_id == customer_id)
    ).first():
        raise HTTPException(status_code=400, detail="Cannot delete customer. It is associated with existing delivery orders.")
    db.delete(db_customer)
    db.commit()
    return None

# --- Delivery Order Routes ---
@router.post("/delivery_orders/", response_model=schemas.DeliveryOrder, status_code=status.HTTP_201_CREATED)
def create_delivery_order(delivery_order_data: schemas.DeliveryOrderCreate, db: Session = Depends(get_db)):
    # Validate foreign keys
    get_company_or_404(db, delivery_order_data.seller_company_id)
    get_customer_or_404(db, delivery_order_data.buyer_customer_id)
    if delivery_order_data.consignee_customer_id:
        get_customer_or_404(db, delivery_order_data.consignee_customer_id)

    # Check for unique invoice_number per seller_company_id
    existing_do = db.query(models.DeliveryOrder).filter(
        models.DeliveryOrder.invoice_number == delivery_order_data.invoice_number,
        models.DeliveryOrder.seller_company_id == delivery_order_data.seller_company_id
    ).first()
    if existing_do:
        raise HTTPException(
            status_code=400,
            detail=f"Invoice number '{delivery_order_data.invoice_number}' already exists for this seller."
        )

    # Create DeliveryOrder instance (without nested items yet)
    do_dict = delivery_order_data.model_dump(exclude={'line_items', 'charges', 'payment_details', 'remarks'})
    db_delivery_order = models.DeliveryOrder(**do_dict)
    db_delivery_order.invoice_date = delivery_order_data.invoice_date

    # Add LineItems
    for item_data in delivery_order_data.line_items:
        # You might want to recalculate item_data.amount here to ensure consistency
        # item_data.amount = item_data.quantity_quintals * item_data.rate
        db_item = models.LineItem(**item_data.model_dump(), delivery_order=db_delivery_order)
        # db.add(db_item) # Not strictly necessary if using backref and adding to DO's list
        db_delivery_order.line_items.append(db_item)


    # Add Charges (if provided)
    if delivery_order_data.charges:
        # You might want to recalculate charges.total_invoice_amount here
        db_charges = models.Charges(**delivery_order_data.charges.model_dump(), delivery_order=db_delivery_order)
        db_delivery_order.charges = db_charges # Assign to the relationship

    # Add PaymentDetails
    for payment_data in delivery_order_data.payment_details:
        db_payment = models.PaymentDetail(**payment_data.model_dump(), delivery_order=db_delivery_order)
        db_delivery_order.payment_details.append(db_payment)

    # Add Remarks
    for remark_data in delivery_order_data.remarks:
        db_remark = models.Remark(**remark_data.model_dump(), delivery_order=db_delivery_order)
        db_delivery_order.remarks.append(db_remark)

    db.add(db_delivery_order)
    try:
        db.commit()
        db.refresh(db_delivery_order) # Refresh to get IDs and eager load related data
        # Eager load for the response
        return get_delivery_order_or_404(db, db_delivery_order.id, eager_load=True)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating delivery order: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/delivery_orders/", response_model=List[schemas.DeliveryOrder])
def read_delivery_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    delivery_orders = db.query(models.DeliveryOrder).options(
        joinedload(models.DeliveryOrder.seller_company),
        joinedload(models.DeliveryOrder.buyer_customer),
        joinedload(models.DeliveryOrder.consignee_customer),
        joinedload(models.DeliveryOrder.line_items),
        joinedload(models.DeliveryOrder.charges),
        joinedload(models.DeliveryOrder.payment_details),
        joinedload(models.DeliveryOrder.remarks)
    ).offset(skip).limit(limit).all()
    return delivery_orders

@router.get("/delivery_orders/{delivery_order_id}", response_model=schemas.DeliveryOrder)
def read_delivery_order(delivery_order_id: int, db: Session = Depends(get_db)):
    delivery_order = get_delivery_order_or_404(db, delivery_order_id, eager_load=True)
    print(f"Seller logo: {delivery_order.seller_company.logo}")
    return delivery_order

@router.put("/delivery_orders/{delivery_order_id}", response_model=schemas.DeliveryOrder)
def update_delivery_order(delivery_order_id: int, delivery_order_update: schemas.DeliveryOrderUpdate, db: Session = Depends(get_db)):
    db_delivery_order = get_delivery_order_or_404(db, delivery_order_id, eager_load=True)

    update_data = delivery_order_update.model_dump(exclude_unset=True)

    # Update top-level DeliveryOrder fields
    for key, value in update_data.items():
        if key not in ['line_items', 'charges', 'payment_details', 'remarks']:
            # Validate FKs if they are being changed
            if key == "seller_company_id" and value != db_delivery_order.seller_company_id:
                get_company_or_404(db, value)
            if key == "buyer_customer_id" and value != db_delivery_order.buyer_customer_id:
                get_customer_or_404(db, value)
            if key == "consignee_customer_id" and value != db_delivery_order.consignee_customer_id:
                if value is not None: get_customer_or_404(db, value)

            # Check for unique invoice_number per seller_company_id if invoice_number or seller_company_id changes
            new_invoice_number = update_data.get("invoice_number", db_delivery_order.invoice_number)
            new_seller_id = update_data.get("seller_company_id", db_delivery_order.seller_company_id)
            if (key == "invoice_number" or key == "seller_company_id") and \
               (new_invoice_number != db_delivery_order.invoice_number or new_seller_id != db_delivery_order.seller_company_id):
                existing_do = db.query(models.DeliveryOrder).filter(
                    models.DeliveryOrder.invoice_number == new_invoice_number,
                    models.DeliveryOrder.seller_company_id == new_seller_id,
                    models.DeliveryOrder.id != delivery_order_id # Exclude current DO
                ).first()
                if existing_do:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invoice number '{new_invoice_number}' already exists for the target seller."
                    )
                    setattr(db_delivery_order, key, value)
    
        # Manually set invoice_date since it's not directly in the schema
        db_delivery_order.invoice_date = delivery_order_update.invoice_date
        db_delivery_order.truck_no = delivery_order_update.truck_no

        db.commit()
        db.refresh(db_delivery_order)

    # Handle nested LineItems: Replace all existing if provided
    if delivery_order_update.line_items is not None: # Check if key is present, even if list is empty
        # Delete existing line items
        for item in list(db_delivery_order.line_items): # Iterate over a copy for safe removal
            db.delete(item)
        db.flush() # Ensure deletes are processed before adds if there are constraints
        # Add new line items
        db_delivery_order.line_items.clear() # Clear the ORM collection
        for item_data in delivery_order_update.line_items:
            db_item = models.LineItem(**item_data.model_dump(), delivery_order_id=db_delivery_order.id)
            db_delivery_order.line_items.append(db_item)


    # Handle nested Charges: Update or create if provided
    if delivery_order_update.charges is not None:
        if db_delivery_order.charges: # Update existing charges
            charges_update_data = delivery_order_update.charges.model_dump(exclude_unset=True)
            for key, value in charges_update_data.items():
                setattr(db_delivery_order.charges, key, value)
        else: # Create new charges
            db_charges = models.Charges(**delivery_order_update.charges.model_dump(), delivery_order_id=db_delivery_order.id)
            db_delivery_order.charges = db_charges


    # Handle nested PaymentDetails: Replace all existing if provided
    if delivery_order_update.payment_details is not None:
        for payment in list(db_delivery_order.payment_details):
            db.delete(payment)
        db.flush()
        db_delivery_order.payment_details.clear()
        for payment_data in delivery_order_update.payment_details:
            db_payment = models.PaymentDetail(**payment_data.model_dump(), delivery_order_id=db_delivery_order.id)
            db_delivery_order.payment_details.append(db_payment)


    # Handle nested Remarks: Replace all existing if provided
    if delivery_order_update.remarks is not None:
        for remark in list(db_delivery_order.remarks):
            db.delete(remark)
        db.flush()
        db_delivery_order.remarks.clear()
        for remark_data in delivery_order_update.remarks:
            db_remark = models.Remark(**remark_data.model_dump(), delivery_order_id=db_delivery_order.id)
            db_delivery_order.remarks.append(db_remark)

    try:
        db.commit()
        db.refresh(db_delivery_order)
        # Eager load for the response
        return get_delivery_order_or_404(db, db_delivery_order.id, eager_load=True)

    except Exception as e:
        db.rollback()
        logger.error(f"Error updating delivery order {delivery_order_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/delivery_orders/{delivery_order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_order(delivery_order_id: int, db: Session = Depends(get_db)):
    db_delivery_order = get_delivery_order_or_404(db, delivery_order_id)
    db.delete(db_delivery_order) # Cascade delete should handle children
    db.commit()
    return None

# --- API Routes (existing ones, adjust if needed) ---
@router.post("/api/customers/", response_model=schemas.Customer, status_code=status.HTTP_201_CREATED, tags=["API - Legacy?"])
def create_customer_api(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    logger.warning("Using legacy /api/customers/ endpoint. Consider migrating to /customers/.")
    try:
        db_customer = models.Customer(**customer.model_dump())
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        return db_customer
    except Exception as e:
        logger.error(f"Error saving customer via API: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save customer: {e}")

@router.post("/api/invoice/generate/{delivery_order_id}", tags=["API - PDF Generation"])
async def generate_invoice(request: Request, delivery_order_id: int, db: Session = Depends(get_db)):
    # Fetch delivery order from the database
    delivery_order = get_delivery_order_or_404(db, delivery_order_id, eager_load=True)

    # Build context for the template
    context = {
        "seller": {
            "name": delivery_order.seller_company.name,
            "address": delivery_order.seller_company.address,
            "phone": delivery_order.seller_company.phone_number,
            "email": delivery_order.seller_company.email,
            "gst_number": delivery_order.seller_company.gst_number,
            "pan_number": delivery_order.seller_company.pan_number,
            "tan_number": delivery_order.seller_company.tan_number,
            "logo": os.path.join(IMAGE_DIR, os.path.basename(delivery_order.seller_company.logo)) if delivery_order.seller_company.logo else None,
            "authorized_signature_image": os.path.join(IMAGE_DIR, os.path.basename(delivery_order.seller_company.authorized_signature_image)) if delivery_order.seller_company.authorized_signature_image else None,


        },
        "order": {
            "invoice_number": delivery_order.invoice_number,
            "invoice_date": delivery_order.invoice_date,
            "delivery_date": delivery_order.invoice_date,
            "truck_no": delivery_order.truck_no,
            "vehicle_number": delivery_order.truck_no,
        },
        "buyer": {
            "name": delivery_order.buyer_customer.name,
            "address": delivery_order.buyer_customer.address,
            "phone": delivery_order.buyer_customer.phone,
            "gstin": delivery_order.buyer_customer.gstin,
            "tan": delivery_order.buyer_customer.tan,
            "fssai": delivery_order.buyer_customer.fssai,


        },
        "consignee": {
            "name": delivery_order.consignee_customer.name if delivery_order.consignee_customer else delivery_order.buyer_customer.name,
            "address": delivery_order.consignee_customer.address if delivery_order.consignee_customer else delivery_order.buyer_customer.address,
            "phone": delivery_order.consignee_customer.phone if delivery_order.consignee_customer else delivery_order.buyer_customer.phone,
            "gstin": delivery_order.consignee_customer.gstin if delivery_order.consignee_customer else delivery_order.buyer_customer.gstin,
            "tan": delivery_order.consignee_customer.tan if delivery_order.consignee_customer else delivery_order.buyer_customer.tan,
            "fssai": delivery_order.consignee_customer.fssai if delivery_order.consignee_customer else delivery_order.buyer_customer.fssai,
        },
        "items": [{
            "mill": item.mill,
            "bargain_no": item.bargain_no,
            "quality": item.quality,
            "quantity_quintals": item.quantity_quintals,
            "rate": item.rate,
            "amount": item.amount,
        } for item in delivery_order.line_items],
        "charges": {
            "insurance_amount": delivery_order.charges.insurance_amount if delivery_order.charges else 0,
            "penalty_amount": delivery_order.charges.penalty_amount if delivery_order.charges else 0,
            "tds_amount": delivery_order.charges.tds_amount if delivery_order.charges else 0,
            "gst_amount": delivery_order.charges.gst_amount if delivery_order.charges else 0,
            "tds_pct": delivery_order.charges.tds_pct if delivery_order.charges else 0,
            "gst_pct": delivery_order.charges.gst_pct if delivery_order.charges else 0,
            "total_invoice_amount": delivery_order.charges.total_invoice_amount if delivery_order.charges else 0,
        } if delivery_order.charges else {},
        "payment": {
            "payment_terms": delivery_order.payment_details[0].payment_terms if delivery_order.payment_details else "",
            "bank_name": delivery_order.payment_details[0].bank_name if delivery_order.payment_details else "",
            "account_number": delivery_order.payment_details[0].account_number if delivery_order.payment_details else "",
            "ifsc_code": delivery_order.payment_details[0].ifsc_code if delivery_order.payment_details and delivery_order.payment_details[0].ifsc_code else "",
        } if delivery_order.payment_details else {},
        "remarks": [remark.text for remark in delivery_order.remarks] if delivery_order.remarks else [],
    }

    # Load & render the styled template
    try:
        template = templates.env.get_template("invoice.html")
        print(context)
        html_content = template.render(**context)
    except Exception as e:
        logger.error(f"Error rendering invoice template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error rendering template: {str(e)}")


    # Tell WeasyPrint where CSS/images live
    # Ensure this path is correct relative to where the app runs
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    # If your static files are served from a different root, adjust base_url
    # For local static files referenced in HTML (like images, CSS), base_url is important.
    # Example: If invoice.html has <img src="logo.png">, WeasyPrint looks for templates/logo.png

    logger.info(f"WeasyPrint base_url for PDF generation: {base_path}")

    try:
        pdf_bytes = HTML(string=html_content, base_url=f"file://{base_path}/").write_pdf()
    except Exception as e:
        logger.error(f"Error generating PDF with WeasyPrint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=invoice.pdf"},
    )

# --- Invoice Number Generation Endpoint ---
@router.get("/api/invoices/next_number", tags=["API - Invoice"])
def get_next_invoice_number(db: Session = Depends(get_db)):
    """
    Generates the next invoice number based on the latest entry.
    Format: DD-MM-YYYY-N
    """
    from datetime import date
    import re

    current_date = date.today()
    current_date_str = current_date.strftime("%d-%m-%Y")

    # Fetch the latest invoice entry
    latest_invoice = db.query(models.DeliveryOrder).order_by(models.DeliveryOrder.id.desc()).first()

    next_sequence_number = 1

    if latest_invoice and latest_invoice.invoice_number:
        # Parse the latest invoice number
        match = re.match(r"(\d{2}-\d{2}-\d{4})-(\d+)", latest_invoice.invoice_number)
        if match:
            invoice_date_str, sequence_str = match.groups()
            latest_invoice_date = datetime.strptime(invoice_date_str, "%d-%m-%Y").date()
            latest_sequence_number = int(sequence_str)

            # Compare dates
            if latest_invoice_date == current_date:
                next_sequence_number = latest_sequence_number + 1

    new_invoice_number = f"{current_date_str}-{next_sequence_number}"

    return {"next_invoice_number": new_invoice_number}


# --- Image Upload Routes ---
@router.post("/upload/image", tags=["Image Management"])
async def upload_image(file: UploadFile = File(...)):
    try:
        # Create the directory if it doesn't exist
        os.makedirs(IMAGE_DIR, exist_ok=True)
        logger.info(f"Attempting to save image to: {IMAGE_DIR}")

        file_extension = os.path.splitext(file.filename)[1]
        if not file_extension: # Default extension if none provided
             file_extension = ".png" # Or handle as error
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(IMAGE_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Image uploaded successfully: {file_path}")
        # Return a path that the client can use (e.g., relative to static serving)
        return {"filename": unique_filename, "path": f"/images/{unique_filename}"}
    except Exception as e:
        logger.error(f"Error uploading image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error uploading image: {e}")

@router.get("/images/{image_filename}", tags=["Image Management"]) # Changed image_path to image_filename
async def get_image(image_filename: str):
    file_path = os.path.join(IMAGE_DIR, image_filename)
    if not os.path.isfile(file_path): # Check if it's a file and exists
        logger.warning(f"Image not found: {file_path}")
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)
