from fastapi import FastAPI, Request, Form, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
import PyPDF2
from presigned_url import AWSTranscribePresignedURL

from dotenv import load_dotenv
import os
import requests

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

resume = ""
job = ""

# Replace these with your actual AWS credentials
ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
SECRET_KEY =  os.getenv("AWS_SECRET_KEY")
SESSION_TOKEN = None
AWS_REGION =  os.getenv("AWS_REGION")

transcribe_url_generator = AWSTranscribePresignedURL(ACCESS_KEY, SECRET_KEY, SESSION_TOKEN, AWS_REGION)


@app.get("/aws-transcribe-url", response_class=JSONResponse)
async def get_aws_transcribe_url(
        sample_rate: int = 44100,
        language_code: str = "en-US",
        media_encoding: str = "pcm"
        # Add other parameters as needed
):
    try:
        pre_signed_url = transcribe_url_generator.get_request_url(
            sample_rate=sample_rate,
            language_code=language_code,
            media_encoding=media_encoding,
            # Include other parameters as needed
        )

        return JSONResponse(content={"pre_signed_url": pre_signed_url})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        global resume
        contents = await file.read()
        contents_io = BytesIO(contents)
        reader = PyPDF2.PdfReader(contents_io)
        resume = ''.join([page.extract_text() for page in reader.pages])
        return JSONResponse(content={"text": resume})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/job_description")
async def upload_jd(request: Request):
    global job
    json_data = await request.json()
    print(json_data)
    job = json_data['jobDescription']
    return json_data

@app.get("/")
async def root():
    return {"message": "hello world"}
