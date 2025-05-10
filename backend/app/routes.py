# app/routes.py
import os
from io import BytesIO

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from fastapi.templating import Jinja2Templates
from weasyprint import HTML

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/ping")
def ping():
    return {"message": "pong"}


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
