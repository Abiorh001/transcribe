from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
import PyPDF2
from pydantic import BaseModel
from presigned_url import AWSTranscribePresignedURL
from dotenv import load_dotenv
import os
import requests

load_dotenv()

# Replace these with your actual AWS credentials
ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
SECRET_KEY = os.getenv("AWS_SECRET_KEY")
SESSION_TOKEN = None
AWS_REGION = os.getenv("AWS_REGION")

transcribe_url_generator = AWSTranscribePresignedURL(ACCESS_KEY, SECRET_KEY, SESSION_TOKEN, AWS_REGION)

GPT_MODEL = "gpt-4-1106-preview"

# Initialize FastAPI app instance.
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatData(BaseModel):
    resume: str
    job: str
    transcription: str

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
"""

def chat_completion_request(messages, model=GPT_MODEL,  max_tokens=100):
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + os.getenv('OPENAI_API_KEY'),
    }
    json_data = {"model": model, "messages": messages}
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json=json_data,
    )
    return response.json()

def generate_openai_messages(chat_data: ChatData):
    system_str = """
    You are an interview assistant, providing real-time responses to interviewees during a remote, virtual job interview. 
    You take in audio data from the interviewer, such as questions and statements, and generate personalized responses based on the user's resume, the job description, and set goals for that interview session.
    You will also provide responses to technical questions, giving examples and highlighting experience on the resume related to the question or tool. You fill in the gaps and provide responses to questions if asked by the interviewer, and output clear responses for the interviewee to read out loud.
    During the interview session, the questions or statements will come in blocks. If it is a statement from the interviewer, you will elaborate on the statement and provide more detail based on the user's resume and add relevant details if absent, to make the user seem knowledgeable and experienced in that topic, tool, workflow, or software.
    If it is a question, you will provide a response based on the interviewee's resume and add relevant details if absent to make the user seem knowledgeable and experienced on that topic, tool, workflow, or software.
    You provide detailed responses in bullet points so they are easily readable by the user. You provide personalized responses based on the resume and job description.
    You will add relevant details where absent to make
    """
    
    messages = [
        {"role": "system", "content": system_str},
        {"role": "system", "content": gpt_msg.format(resume=chat_data.resume, job_description=chat_data.job)},
        {"role": "system", "content": f"This is the transcription of the interview. \n###\n{chat_data.transcription}\n\n###\n"},
    ]

    return messages

# Store received data in a global variable
received_data = None

@app.post("/receive_data")
async def receive_data(chat_data: ChatData):
    global received_data
    received_data = chat_data
    messages = generate_openai_messages(received_data)
    
    response = chat_completion_request(messages)

    summary = None
    try:
        summary = response["choices"][0]["message"]["content"]
    except:
        summary = response["message"]["content"]
    
    print(summary)

    return {"response": summary}

@app.get("/aws-transcribe-url", response_class=JSONResponse)
async def get_aws_transcribe_url(
        sample_rate: int = 44100,
        language_code: str = "en-US",
        media_encoding: str = "pcm"
):
    try:
        pre_signed_url = transcribe_url_generator.get_request_url(
            sample_rate=sample_rate,
            language_code=language_code,
            media_encoding=media_encoding,
        )

        return JSONResponse(content={"pre_signed_url": pre_signed_url})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        contents_io = BytesIO(contents)
        reader = PyPDF2.PdfReader(contents_io)
        transcription = ''.join([page.extract_text() for page in reader.pages])
        return JSONResponse(content={"transcription": transcription})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/job_description")
async def upload_jd(chat_data: ChatData):
    return {"jobDescription": chat_data.job}

@app.get("/")
async def root():
    return {"message": "Hello, World!"}
