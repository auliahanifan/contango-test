import os
import json
import requests
from mastra import Agent
import pdfplumber

agent = Agent()

@agent.task("cv-validate")
def cv_validate(submission_id: str, pdf_path: str, structured_data: dict):
    """Validates that the structured data matches the content of the PDF CV."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = "".join(page.extract_text() for page in pdf.pages)

        mismatches = {}
        for key, value in structured_data.items():
            if str(value).lower() not in text.lower():
                mismatches[key] = {"expected": value, "found": "Not found"}

        valid = not bool(mismatches)
        status = "SUCCESS" if valid else "FAILED"

        # POST result back to the web app
        callback_url = f"{os.environ['TRPC_ENDPOINT']}/validate-callback"
        requests.post(callback_url, json={
            "submissionId": submission_id,
            "status": status,
            "mismatches": mismatches
        })

    except Exception as e:
        # POST error back to the web app
        callback_url = f"{os.environ['TRPC_ENDPOINT']}/validate-callback"
        requests.post(callback_url, json={
            "submissionId": submission_id,
            "status": "FAILED",
            "mismatches": {"error": str(e)}
        })