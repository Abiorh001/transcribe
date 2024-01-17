// import MicrophoneStream from "microphone-stream";
// import { EventStreamMarshaller } from "@aws-sdk/eventstream-marshaller";
// import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";
// import axios from "axios";

// // UPDATE THIS ACCORDING TO YOUR BACKEND:
// const backendUrl = "https://transcribe-backend-yd3k.onrender.com/aws-transcribe-url";

// let socket;
// let transcript = "";
// const SAMPLE_RATE = 44100;
// let inputSampleRate = undefined;
// let sampleRate = SAMPLE_RATE;
// let microphoneStream = undefined;
// const eventStreamMarshaller = new EventStreamMarshaller(toUtf8, fromUtf8);

// export const pcmEncode = (input) => {
//   var offset = 0;
//   var buffer = new ArrayBuffer(input.length * 2);
//   var view = new DataView(buffer);
//   for (var i = 0; i < input.length; i++, offset += 2) {
//     var s = Math.max(-1, Math.min(1, input[i]));
//     view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
//   }
//   return buffer;
// };

// export const downsampleBuffer = (
//   buffer,
//   inputSampleRate = SAMPLE_RATE,
//   outputSampleRate = 16000
// ) => {
//   if (outputSampleRate === inputSampleRate) {
//     return buffer;
//   }

//   var sampleRateRatio = inputSampleRate / outputSampleRate;
//   var newLength = Math.round(buffer.length / sampleRateRatio);
//   var result = new Float32Array(newLength);
//   var offsetResult = 0;
//   var offsetBuffer = 0;

//   while (offsetResult < result.length) {
//     var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

//     var accum = 0,
//       count = 0;

//     for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
//       accum += buffer[i];
//       count++;
//     }

//     result[offsetResult] = accum / count;
//     offsetResult++;
//     offsetBuffer = nextOffsetBuffer;
//   }

//   return result;
// };

// const getAudioEventMessage = (buffer) => {
//   return {
//     headers: {
//       ":message-type": {
//         type: "string",
//         value: "event",
//       },
//       ":event-type": {
//         type: "string",
//         value: "AudioEvent",
//       },
//     },
//     body: buffer,
//   };
// };

// const convertAudioToBinaryMessage = (audioChunk) => {
//   let raw = MicrophoneStream.toRaw(audioChunk);

//   if (raw == null) return;

//   // Adjust the buffer size to potentially decrease latency
//   const bufferSize = 4096;
//   let offset = 0;

//   while (offset < raw.length) {
//     const chunk = raw.slice(offset, offset + bufferSize);
//     let downsampledBuffer = downsampleBuffer(chunk, inputSampleRate, sampleRate);
//     let pcmEncodedBuffer = pcmEncode(downsampledBuffer);
//     let audioEventMessage = getAudioEventMessage(new Uint8Array(pcmEncodedBuffer));
//     let binary = eventStreamMarshaller.marshall(audioEventMessage);

//     socket.send(binary);

//     offset += bufferSize;
//   }
// };

// export const createMicrophoneStream = async () => {
//   try {
//     // Check for browser compatibility
//     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//       throw new Error("getUserMedia is not supported in this browser.");
//     }

//     microphoneStream = new MicrophoneStream();
//     microphoneStream.on("format", (data) => {
//       inputSampleRate = data.sampleRate;
//     });

//     // Use getDisplayMedia to capture audio from the current tab
//     const mediaStream = await navigator.mediaDevices.getDisplayMedia({
//       video: true,
//       audio: true,
//     });

//     microphoneStream.setStream(mediaStream);
//   } catch (error) {
//     console.error("Error creating microphone stream:", error.message);
//   }
// };

// export const startRecording = async (callback) => {
//   if (microphoneStream) {
//     stopRecording();
//   }

//   try {
//     const { data: presignedUrlData } = await axios.get(backendUrl);

//     // Extract WebSocket URL from the provided JSON object
//     const websocketUrl = presignedUrlData?.pre_signed_url;
   

//     // Check if the WebSocket URL is present
//     if (!websocketUrl) {
//       throw new Error("WebSocket URL not found in the provided JSON object.");
//     }

//     socket = new WebSocket(websocketUrl);
//     socket.binaryType = "arraybuffer";
//     transcript = "";

//     socket.onopen = function () {
//       if (socket.readyState === socket.OPEN) {
//         microphoneStream.on("data", function (rawAudioChunk) {
//           convertAudioToBinaryMessage(rawAudioChunk);
//         });
//       }
//     };

//     socket.onmessage = function (message) {
//       let messageWrapper = eventStreamMarshaller.unmarshall(Buffer(message.data));
//       let messageBody = JSON.parse(String.fromCharCode.apply(String, messageWrapper.body));
//       if (messageWrapper.headers[":message-type"].value === "event") {
//         let results = messageBody.Transcript?.Results;
//         if (results && results.length && !results[0]?.IsPartial) {
//           const newTranscript = results[0].Alternatives[0].Transcript;
//           transcript += newTranscript + " ";
//           callback(transcript);
//         }
//       }
//     };

//     socket.onerror = function (error) {
//       console.log("WebSocket connection error. Try again.", error);
//     };

//     socket.onclose = function (event) {
//       console.log("WebSocket connection closed. Code:", event.code, "Reason:", event.reason);
//       stopRecording();
//     };

//     await createMicrophoneStream(); // Make sure to await createMicrophoneStream
//   } catch (error) {
//     console.error("An error occurred while obtaining the presigned URL:", error.message);
//     stopRecording();
//   }
// };

// export const stopRecording = () => {
//   if (microphoneStream) {
//     console.log("Recording stopped");
//     microphoneStream.stop();
//     microphoneStream.destroy();
//     microphoneStream = undefined;
//   }
// };


import MicrophoneStream from "microphone-stream";
import { EventStreamMarshaller } from "@aws-sdk/eventstream-marshaller";
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";
import axios from "axios";

// UPDATE THIS ACCORDING TO YOUR BACKEND:
const backendUrl = "http://127.0.0.1:8000/aws-transcribe-url";

let socket;
let transcript = "";
let timer;
const SAMPLE_RATE = 44100;
let inputSampleRate = undefined;
let sampleRate = SAMPLE_RATE;
let microphoneStream = undefined;
const eventStreamMarshaller = new EventStreamMarshaller(toUtf8, fromUtf8);
const pauseThreshold = 2000; // Adjust the pause threshold as needed (in milliseconds)

export const pcmEncode = (input) => {
  var offset = 0;
  var buffer = new ArrayBuffer(input.length * 2);
  var view = new DataView(buffer);
  for (var i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
};

export const downsampleBuffer = (
  buffer,
  inputSampleRate = SAMPLE_RATE,
  outputSampleRate = 16000
) => {
  if (outputSampleRate === inputSampleRate) {
    return buffer;
  }

  var sampleRateRatio = inputSampleRate / outputSampleRate;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Float32Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;

  while (offsetResult < result.length) {
    var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

    var accum = 0,
      count = 0;

    for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
};

const getAudioEventMessage = (buffer) => {
  return {
    headers: {
      ":message-type": {
        type: "string",
        value: "event",
      },
      ":event-type": {
        type: "string",
        value: "AudioEvent",
      },
    },
    body: buffer,
  };
};

const convertAudioToBinaryMessage = (audioChunk) => {
  let raw = MicrophoneStream.toRaw(audioChunk);

  if (raw == null) return;

  // Adjust the buffer size to potentially decrease latency
  const bufferSize = 4096;
  let offset = 0;

  while (offset < raw.length) {
    const chunk = raw.slice(offset, offset + bufferSize);
    let downsampledBuffer = downsampleBuffer(chunk, inputSampleRate, sampleRate);
    let pcmEncodedBuffer = pcmEncode(downsampledBuffer);
    let audioEventMessage = getAudioEventMessage(new Uint8Array(pcmEncodedBuffer));
    let binary = eventStreamMarshaller.marshall(audioEventMessage);

    socket.send(binary);

    offset += bufferSize;
  }
};

export const createMicrophoneStream = async () => {
  try {
    // Check for browser compatibility
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("getUserMedia is not supported in this browser.");
    }

    microphoneStream = new MicrophoneStream();
    microphoneStream.on("format", (data) => {
      inputSampleRate = data.sampleRate;
    });

    // Use getDisplayMedia to capture audio from the current tab
    const mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    microphoneStream.setStream(mediaStream);
  } catch (error) {
    console.error("Error creating microphone stream:", error.message);
  }
};

export const startRecording = async (callback) => {
  if (microphoneStream) {
    stopRecording();
  }

  try {
    const { data: presignedUrlData } = await axios.get(backendUrl);

    // Extract WebSocket URL from the provided JSON object
    const websocketUrl = presignedUrlData?.pre_signed_url;

    // Check if the WebSocket URL is present
    if (!websocketUrl) {
      throw new Error("WebSocket URL not found in the provided JSON object.");
    }

    socket = new WebSocket(websocketUrl);
    socket.binaryType = "arraybuffer";
    transcript = "";

    socket.onopen = function () {
      if (socket.readyState === socket.OPEN) {
        microphoneStream.on("data", function (rawAudioChunk) {
          convertAudioToBinaryMessage(rawAudioChunk);
        });
      }
    };

    socket.onmessage = function (message) {
      let messageWrapper = eventStreamMarshaller.unmarshall(Buffer(message.data));
      let messageBody = JSON.parse(String.fromCharCode.apply(String, messageWrapper.body));

      if (messageWrapper.headers[":message-type"].value === "event") {
        let results = messageBody.Transcript?.Results;

        if (results && results.length && !results[0]?.IsPartial) {
          const newTranscript = results[0].Alternatives[0].Transcript;

          if (timer) {
            clearTimeout(timer);
          }

          transcript += newTranscript + " ";
          callback(transcript);

          // Set a timer to clear the transcript after a pause
          timer = setTimeout(() => {
            transcript = "";
          }, pauseThreshold);
        }
      }
    };

    socket.onerror = function (error) {
      console.log("WebSocket connection error. Try again.", error);
    };

    socket.onclose = function (event) {
      console.log("WebSocket connection closed. Code:", event.code, "Reason:", event.reason);
      stopRecording();
    };

    await createMicrophoneStream(); // Make sure to await createMicrophoneStream
  } catch (error) {
    console.error("An error occurred while obtaining the presigned URL:", error.message);
    stopRecording();
  }
};

export const stopRecording = () => {
  if (microphoneStream) {
    console.log("Recording stopped");
    microphoneStream.stop();
    microphoneStream.destroy();
    microphoneStream = undefined;
  }
};
