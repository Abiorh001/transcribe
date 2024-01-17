import * as TranscribeSocket from "./transcribeSocket.js";

const recordButtonSocket = document.getElementById("recordSocket");
const transcribedText = document.getElementById("transcribedText");
const responseText = document.getElementById("responseText");

window.onRecordSocketPress = async () => {
  if (recordButtonSocket.getAttribute("class") === "recordInactive") {
    // Start recording
    try {
      recordButtonSocket.setAttribute("class", "recordActive");
      await startRecording("socket");
    } catch (error) {
      alert("An error occurred while starting recording: " + error.message);
    }
  } else {
    // Stop recording
    stopRecording();
  }
};

const startRecording = async (type) => {
  window.clearTranscription();
  try {
    if (type === "socket") {
      await TranscribeSocket.startRecording(onTranscriptionDataReceived);
    }
  } catch (error) {
    alert("An error occurred while recording: " + error.message);
    stopRecording();
  }
};

const onTranscriptionDataReceived = async (data) => {
  // Append the new data to the existing content
  transcribedText.innerHTML += data;

  // Scroll to the bottom to show the latest transcription
  transcribedText.scrollTop = transcribedText.scrollHeight;

  // Send the data to the backend for processing immediately
  sendDataToBackend(data);
};

const sendDataToBackend = async (data) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/receive_data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resume: "one year experience i have in my resume",
        job: "software engineer entry level",
        transcription: data,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Get and display the response instantly
    const responseData = await response.json();
    responseText.innerHTML += responseData.response + "<br>";
    responseText.scrollTop = responseText.scrollHeight;
  } catch (error) {
    console.error("Error sending/receiving data:", error);
  }
};

const stopRecording = function () {
  recordButtonSocket.setAttribute("class", "recordInactive");
  TranscribeSocket.stopRecording();
};

window.clearTranscription = () => {
  transcribedText.innerHTML = "";
};
