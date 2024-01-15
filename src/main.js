import * as TranscribeSocket from "./transcribeSocket.js";

const recordButtonSocket = document.getElementById("recordSocket");
const transcribedText = document.getElementById("transcribedText");

window.onRecordSocketPress = () => {
  if (recordButtonSocket.getAttribute("class") === "recordInactive") {
    startRecording("socket");
  } else {
    stopRecording();
  }
};

const startRecording = async (type) => {
  window.clearTranscription();
  try {
    if (type === "socket") {
      recordButtonSocket.setAttribute("class", "recordActive");
      await TranscribeSocket.startRecording(onTranscriptionDataReceived);
    }
  } catch (error) {
    alert("An error occurred while recording: " + error.message);
    stopRecording();
  }
};

const onTranscriptionDataReceived = (data) => {
  transcribedText.insertAdjacentHTML("beforeend", data);
};

const stopRecording = function () {
  recordButtonSocket.setAttribute("class", "recordInactive");
  TranscribeSocket.stopRecording();
};

window.clearTranscription = () => {
  transcribedText.innerHTML = "";
};
