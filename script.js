import languages from "./languages.js";

const recordBtn = document.querySelector(".record"),
  result = document.querySelector(".result"),
  downloadBtn = document.querySelector(".download"),
  inputLanguage = document.querySelector("#language"),
  clearBtn = document.querySelector(".clear"),
  audioToTextBtn = document.querySelector(".audio-file-to-text"),
  audioLinkInputForm = document.querySelector(".link-to-text");

let recording = false,
  chunks = [],
  mediaRecorder;

function populateLanguages() {
  languages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.innerHTML = lang.name;
    inputLanguage.appendChild(option);
  });
}

populateLanguages();

// Function to send the file object to the Whisper API
async function sendFileToWhisperAPI(file, language = "en") {
  // Create a FormData object to handle the file
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", "whisper-1");
  formData.append("language", language);
  // Make a request to the Whisper API
  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization:
          "Bearer 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",
      },
      body: formData,
    }
  );

  // // Handle the response as needed
  const resultText = await response.json();
  const { text } = resultText;
  result.innerHTML += " " + text;
  result.querySelector("p")?.remove();
  downloadBtn.disabled = false;
}

function uploadFile() {
  // Create an input element of type file
  var fileInput = document.createElement("input");
  fileInput.type = "file";

  // Set the accept attribute to allow only MP3 and MP4 files
  fileInput.accept = "audio/*,video/*";

  // Set the style to make it invisible
  fileInput.style.display = "none";

  // Append the input element to the body
  document.body.appendChild(fileInput);

  // Trigger a click on the input element
  fileInput.click();

  // Listen for the change event on the input element
  fileInput.addEventListener("change", async function () {
    sendFileToWhisperAPI(fileInput.files[0]);

    // Remove the input element from the DOM
    document.body.removeChild(fileInput);
  });
}

async function fetchAudioFile(audioLink) {
  try {
    // Make a fetch request to get the audio file
    const response = await fetch(
      `https://cors-anywhere.herokuapp.com/${audioLink}`,
      {
        headers: {
          Origin: audioLink,
        },
      }
    );

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file. Status: ${response.status}`);
    }

    const blob = await response.blob();

    // Create a File object from the Blob
    const fileName = audioLink.slice(audioLink.lastIndexOf("/") + 1);
    const fileType = blob.type;
    const file = new File([blob], fileName, { type: fileType });

    // Call a function to send the blob to the Whisper API
    await sendFileToWhisperAPI(file);
  } catch (error) {
    console.error("Error fetching audio file:", error);
    // Handle the error as needed
  }
}

recordBtn.addEventListener("click", () => {
  if (!recording) {
    startRecording();
    recording = true;
  } else {
    stopRecording();
  }
});

async function startRecording() {
  let constraints;

  if (inputLanguage.value === "system") {
    // For system audio, use a specific audio output device
    const audioOutputDevices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputDevice = audioOutputDevices.find(
      (device) => device.kind === "audiooutput"
    );

    if (audioOutputDevice) {
      constraints = {
        audio: {
          deviceId: { exact: audioOutputDevice.deviceId },
        },
      };
    }
  } else {
    // For language audio (microphone), use default microphone
    constraints = { audio: true };
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  mediaRecorder = new MediaRecorder(stream);

  recordBtn.classList.add("recording");
  recordBtn.querySelector("p").innerHTML = "Listening...";

  // Event listener for dataavailable event
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // Event listener for stopping recording
  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(chunks, { type: "audio/wav" });
    const audioFile = new File([audioBlob], "recording.wav", {
      type: "audio/wav",
    });

    sendFileToWhisperAPI(
      audioFile,
      inputLanguage.value !== "system" ? inputLanguage.value : undefined
    );
    chunks = [];
  };

  // Start recording
  mediaRecorder.start();
}

// Function to stop recording
function stopRecording() {
  if (mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    recordBtn.querySelector("p").innerHTML = "Start Listening";
    recordBtn.classList.remove("recording");
    recording = false;
  }
}

function download() {
  const text = result.innerText;
  const filename = "file.txt";

  const element = document.createElement("a");
  element.style.display = "none";
  document.body.appendChild(element);
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );

  //   const content = `
  //   <html xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  //     <head>
  //       <style>
  //         body {
  //           font-family: Arial, sans-serif;
  //           font-size: 12pt;
  //         }
  //       </style>
  //     </head>
  //     <body>
  //       <p>${text}</p>
  //     </body>
  //   </html>
  // `;

  //   const blob = new Blob(["\ufeff", content], { type: "application/msword" });

  //   element.href = URL.createObjectURL(blob);
  element.setAttribute("download", filename);

  element.click();
  document.body.removeChild(element);
}

audioToTextBtn.addEventListener("click", uploadFile);

downloadBtn.addEventListener("click", download);

clearBtn.addEventListener("click", () => {
  result.innerHTML = "";
  downloadBtn.disabled = true;
});

audioLinkInputForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = [...new FormData(audioLinkInputForm)];
  const { audio } = Object.fromEntries(formData);
  fetchAudioFile(audio);
});
