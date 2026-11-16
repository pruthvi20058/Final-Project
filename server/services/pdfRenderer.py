import sys
import os
import json

def process_pdf(pdf_path, out_dir=None):
    if not os.path.isfile(pdf_path):
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(1)
        
    try:
        import fitz
    except ImportError:
        print(json.dumps({"error": "PyMuPDF (fitz) is not installed"}))
        sys.exit(1)

    try:
        doc = fitz.open(pdf_path)
        page_count = doc.page_count
        pages_data = []
        full_selectable_text = []

        if out_dir is None:
            out_dir = os.path.dirname(pdf_path)
            
        os.makedirs(out_dir, exist_ok=True)
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]

        for i in range(page_count):
            page = doc[i]
            page_text = page.get_text() or ""
            full_selectable_text.append(page_text)
            
            # Render page to high-res image (DPI = 200 for crisp OCR)
            pix = page.get_pixmap(dpi=200)
            img_path = os.path.join(out_dir, f"{base_name}_page_{i+1}.png")
            pix.save(img_path)
            
            pages_data.append({
                "page": i + 1,
                "imagePath": img_path,
                "textLength": len(page_text.strip()),
                "width": pix.width,
                "height": pix.height
            })

        result = {
            "pageCount": page_count,
            "selectableText": "\n--- PAGE BREAK ---\n".join(full_selectable_text),
            "totalTextLength": sum(len(t.strip()) for t in full_selectable_text),
            "pages": pages_data
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python pdfRenderer.py <pdf_path> [out_dir]"}))
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    output_directory = sys.argv[2] if len(sys.argv) > 2 else None
    process_pdf(pdf_file, output_directory)
