from fastapi import FastAPI
from fastapi.responses import JSONResponse
from typing import Optional
from prolly import AWSTranscribePresignedURL
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Replace these with your actual AWS credentials
ACCESS_KEY = "AKIA3FLD2CD74VT232PP"
SECRET_KEY = "6oqjNFACmWHl4FFTiIXKxirBXI8Ic/EKphBOhyHD"
SESSION_TOKEN = None  # Optional, set to None if not using sessions
AWS_REGION = "us-east-1"

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
