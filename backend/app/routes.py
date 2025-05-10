# app/routes.py
import os
import uuid
import shutil
from io import BytesIO

from fastapi import APIRouter, Request, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from weasyprint import HTML

from . import models, schemas, database

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# Directory to store uploaded images
IMAGE_DIR = "backend/static/images"

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/ping")
def ping():
    return {"message": "pong"}


@router.post("/companies/", response_model=schemas.Company)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    db_company = models.Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/companies/", response_model=list[schemas.Company])
def read_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    companies = db.query(models.Company).offset(skip).limit(limit).all()
    return companies

@router.get("/companies/{company_id}", response_model=schemas.Company)
def read_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/companies/{company_id}", response_model=schemas.Company)
def update_company(company_id: int, company: schemas.CompanyUpdate, db: Session = Depends(get_db)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if db_company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    for key, value in company.model_dump(exclude_unset=True).items():
        setattr(db_company, key, value)

    db.commit()
    db.refresh(db_company)
    return db_company

@router.delete("/companies/{company_id}", response_model=schemas.Company)
def delete_company(company_id: int, db: Session = Depends(get_db)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if db_company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    db.delete(db_company)
    db.commit()
    return db_company


@router.post("/api/invoice/generate")
async def generate_invoice(request: Request, invoice_data: dict):
    # Build a context dict with defaults so nothing is ever undefined
    context = {
        "seller":     invoice_data.get("seller", {}),
        "order":      invoice_data.get("order", {}),
        "buyer":      invoice_data.get("buyer", {}),
        # if no separate consignee was passed, use the buyer as a fallback
        "consignee":  invoice_data.get("consignee", invoice_data.get("buyer", {})),
        "items":      invoice_data.get("items", []),
        "charges":    invoice_data.get("charges", {}),
        "payment":    invoice_data.get("payment", {}),
        "remarks":    invoice_data.get("remarks", []),
    }

    # Load & render the styled template
    template = templates.env.get_template("invoice.html")
    html_content = template.render(**context)

    # Tell WeasyPrint where CSS/images live
    base_path = os.path.abspath("app/templates")

    # Generate PDF
    pdf_bytes = HTML(string=html_content, base_url=base_path).write_pdf()

    # Stream it back
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=invoice.pdf"},
    )

@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    try:
        # Create the directory if it doesn't exist
        os.makedirs(IMAGE_DIR, exist_ok=True)

        # Generate a unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(IMAGE_DIR, unique_filename)

        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {"filename": unique_filename, "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {e}")

@router.get("/images/{image_path}")
async def get_image(image_path: str):
    file_path = os.path.join(IMAGE_DIR, image_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)
