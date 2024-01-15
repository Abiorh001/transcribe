# from fastapi import FastAPI
# from fastapi.responses import JSONResponse
# from typing import Optional
# from prolly import AWSTranscribePresignedURL
# from fastapi.middleware.cors import CORSMiddleware

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"]
# )

# # Replace these with your actual AWS credentials
# ACCESS_KEY = "AKIA3FLD2CD74VT232PP"
# SECRET_KEY = "6oqjNFACmWHl4FFTiIXKxirBXI8Ic/EKphBOhyHD"
# SESSION_TOKEN = None  # Optional, set to None if not using sessions
# AWS_REGION = "us-east-1"

# transcribe_url_generator = AWSTranscribePresignedURL(ACCESS_KEY, SECRET_KEY, SESSION_TOKEN, AWS_REGION)


# @app.get("/aws-transcribe-url", response_class=JSONResponse)
# async def get_aws_transcribe_url(
#         sample_rate: int = 44100,
#         language_code: str = "en-US",
#         media_encoding: str = "pcm"
#         # Add other parameters as needed
# ):
#     try:
#         pre_signed_url = transcribe_url_generator.get_request_url(
#             sample_rate=sample_rate,
#             language_code=language_code,
#             media_encoding=media_encoding,
#             # Include other parameters as needed
#         )

#         return JSONResponse(content={"pre_signed_url": pre_signed_url})

#     except Exception as e:
#         return JSONResponse(content={"error": str(e)}, status_code=500)




from fastapi import FastAPI, Request, WebSocket, Form, BackgroundTasks, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from fastapi import Request, WebSocket, BackgroundTasks
from deepgram import Deepgram
import starlette.websockets
import logging
import time
import uvicorn
from dotenv import load_dotenv
import os
import requests
import threading
import asyncio
import PyPDF2
from io import BytesIO

import openai
from openai import OpenAI
import datetime
from tenacity import retry, wait_random_exponential, stop_after_attempt

load_dotenv()


# Initialize FastAPI app instance.
app = FastAPI()
fastSocket = None
all_data = ""
last_update = None
gpt_msg = """
[Resume]
- {resume}

[Job Description]
- {job_description}.

[Interviewer's Question]
- "[Listen to the interviewer's statement/question. If it's a statement, elaborate on it based on the user's resume, adding relevant details. If it's a question, provide a response in the first person as the interviewee.]"

- If asked about technology experience:
    - "I have solid experience with [Technology], demonstrated in [specific project or role from the resume]. For instance, I [describe relevant experience or achievement]. This hands-on experience equips me to confidently [mention specific skills or tasks related to the technology]."

[Technical Questions]
- Interviewer: "[Pose technical questions. Provide responses with examples and highlight relevant experience on the resume related to the question or tool. Use the STAR method (Situation, Task, Action, Result) for a structured answer.]"

[Personalized Responses]
- [Avoid disclaimers about AI limitations. Provide responses based on the user's skills and experience. Add details where absent to showcase knowledge and expertise. Keep responses in a natural, conversational manner.]

[Additional Information]
- [Include any specific goals or preferences for the interview session.]
 Enable Cross Origin Resource Sharing for all origins, headers and methods.
"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
resume = ""
job = ""
summary = ""

init = False



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


