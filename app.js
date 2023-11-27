// elements
const applyButton = document.getElementById("applyButton");
const downloadButton = document.getElementById("downloadButton");
const fileInput = document.getElementById("file_input");
const filterIntensitySlider = document.getElementById("filterIntensity");
const filterSelect = document.getElementById("filter_select");
const imgInput = document.getElementById("input_image");
const output = document.getElementById("output");
const stickerSizeSlider = document.getElementById("stickerSize");
// utils
let currentFilter = "";
let placedStickers = [];
let selectedSticker = null;
let stickers = [];
let stickerSizeModifier = 1;

loadStickers();

applyButton.addEventListener("click", applyPermanent);
downloadButton.addEventListener("click", downloadImage);
fileInput.addEventListener("change", updateCanvas, false);
output.addEventListener("click", applySticker);

function applyPermanent() {
  if (currentFilter) {
    applyFilter(permanentCanvas, permanentCanvas, currentFilter);
    currentFilter = "";
  }

  // Re-apply stickers
  const ctx = permanentCanvas.getContext("2d");
  for (const stickerInfo of placedStickers) {
    ctx.drawImage(
      stickerInfo.image,
      stickerInfo.x,
      stickerInfo.y,
      stickerInfo.width,
      stickerInfo.height
    );
  }

  // Clear the placed stickers as they are now permanent
  placedStickers = [];
}

function triggerFilter(filterName) {
  const mat = cv.imread(imgInput);
  applyFilter(mat, filterName);
  mat.delete();
}

function previewFilter(filterName) {
  clearStickers();

  currentFilter = filterName;

  applyCurrentFilter();
}

function adjustIntensity() {
  if (currentFilter) {
    applyCurrentFilter();
  }
}

function setStickerSize() {
  stickerSizeModifier = parseFloat(stickerSizeSlider.value);
}

function applyCurrentFilter() {
  const srcCanvas = permanentCanvas; // Assuming permanentCanvas has the original image
  const dstCanvas = output;
  applyFilter(srcCanvas, dstCanvas, currentFilter);
}

function applyFilter(sourceCanvas, destinationCanvas, filter) {
  const srcCtx = sourceCanvas.getContext("2d");
  const imageData = srcCtx.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height
  );
  let inputMat = cv.matFromImageData(imageData);
  let outputMat = new cv.Mat();
  const intensity = parseFloat(filterIntensitySlider.value);
  const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
  const anchor = new cv.Point(-1, -1);

  switch (filter) {
    case "GRAY":
      cv.cvtColor(inputMat, outputMat, cv.COLOR_RGB2GRAY);
      break;
    case "BRIGHTNESS":
      inputMat.convertTo(outputMat, -1, 1, 50);
      break;
    case "CONTRAST":
      inputMat.convertTo(outputMat, -1, 1.5, 0);
      break;
    case "COLOR_OVERLAY":
      const overlayColor = new cv.Mat(
        inputMat.rows,
        inputMat.cols,
        inputMat.type(),
        [Math.random() * 255, Math.random() * 255, Math.random() * 255, 255]
      );
      const alpha = 0.5;
      cv.addWeighted(inputMat, 1 - alpha, overlayColor, alpha, 0, outputMat);
      overlayColor.delete();
      break;
    case "THRESHOLD":
      cv.threshold(inputMat, outputMat, 128, 255, cv.THRESH_BINARY);
      break;
    case "CANNY":
      cv.Canny(inputMat, outputMat, 50, 100);
      break;
    case "BLUR":
      const ksize = new cv.Size(5, 5);
      cv.GaussianBlur(inputMat, outputMat, ksize, 0, 0, cv.BORDER_DEFAULT);
      break;
    case "ERODE":
      cv.erode(
        inputMat,
        outputMat,
        kernel,
        anchor,
        1,
        cv.BORDER_CONSTANT,
        cv.morphologyDefaultBorderValue()
      );
      break;
    case "DILATE":
      cv.dilate(
        inputMat,
        outputMat,
        kernel,
        anchor,
        1,
        cv.BORDER_CONSTANT,
        cv.morphologyDefaultBorderValue()
      );
      break;
    case "SEPIA":
      if (inputMat.type() === cv.CV_8UC1) {
        cv.cvtColor(inputMat, outputMat, cv.COLOR_GRAY2RGB);
      } else {
        inputMat.copyTo(outputMat);
      }

      for (let y = 0; y < outputMat.rows; y++) {
        for (let x = 0; x < outputMat.cols; x++) {
          const pixel = outputMat.ucharPtr(y, x);
          const outputPixel = [
            pixel[2] * 0.393 + pixel[1] * 0.769 + pixel[0] * 0.189,
            pixel[2] * 0.349 + pixel[1] * 0.686 + pixel[0] * 0.168,
            pixel[2] * 0.272 + pixel[1] * 0.534 + pixel[0] * 0.131,
          ];
          outputMat.ucharPtr(y, x)[0] = Math.min(255, outputPixel[2]);
          outputMat.ucharPtr(y, x)[1] = Math.min(255, outputPixel[1]);
          outputMat.ucharPtr(y, x)[2] = Math.min(255, outputPixel[0]);
        }
      }
      break;
    default:
      outputMat = inputMat.clone();
  }

  if (intensity < 1) {
    outputMat = blendWithOriginal(inputMat, outputMat, intensity);
  }

  cv.imshow(destinationCanvas, outputMat);
  outputMat.delete();
  inputMat.delete();
}

function blendWithOriginal(originalMat, filteredMat, intensity) {
  const blended = new cv.Mat();
  cv.addWeighted(
    filteredMat,
    intensity,
    originalMat,
    1 - intensity,
    0,
    blended
  );
  return blended;
}

function loadStickers() {
  const stickerSources = [
    "./stickers/cigar.png",
    "./stickers/deal_with_it_glasses.png",
    "./stickers/doge_deal_with_it.png",
    "./stickers/gabe_the_dog.png",
    "./stickers/get_out_frog.png",
    "./stickers/gold_chain.png",
    "./stickers/googly_eyes.png",
    "./stickers/grumpy_cat.png",
    "./stickers/just_do_it.png",
    "./stickers/meme_man.png",
    "./stickers/moustache.png",
    "./stickers/ricardo.png",
    "./stickers/roll_safe.png",
    "./stickers/snoop_left.png",
    "./stickers/snoop_right.png",
    "./stickers/thug_life_cap.png",
  ];
  stickerSources.forEach((src) => {
    const img = new Image();
    img.src = src;
    stickers.push(img);
  });
}

function selectSticker(index) {
  selectedSticker = stickers[index];
}

function applySticker(event) {
  if (!selectedSticker) {
    return;
  }

  const ctx = this.getContext("2d");
  const rect = this.getBoundingClientRect();
  const sticker = {
    width: permanentCanvas.width * stickerSizeModifier,
    height:
      permanentCanvas.width *
      stickerSizeModifier *
      (selectedSticker.height / selectedSticker.width),
  };
  const x = event.clientX - rect.left - sticker.width / 2;
  const y = event.clientY - rect.top - sticker.height / 2;

  ctx.drawImage(selectedSticker, x, y, sticker.width, sticker.height);

  // Store sticker information
  placedStickers.push({
    image: selectedSticker,
    x: x,
    y: y,
    width: sticker.width,
    height: sticker.height,
  });
}

function clearStickers() {
  const ctx = output.getContext("2d");
  ctx.clearRect(0, 0, output.width, output.height);

  placedStickers = [];

  const ctxPermanent = permanentCanvas.getContext("2d");
  ctx.drawImage(ctxPermanent.canvas, 0, 0);
}

function downloadImage() {
  const canvas = document.getElementById("permanentCanvas");
  const image = canvas
    .toDataURL("image/png")
    .replace("image/png", "image/octet-stream");
  const link = document.createElement("a");
  link.download = "my-canvas-image.png";
  link.href = image;
  link.click();
}

function updateCanvas(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      // Set canvas dimensions to match image dimensions
      permanentCanvas.width = img.width;
      permanentCanvas.height = img.height;
      output.width = img.width;
      output.height = img.height;

      // Draw the image on both canvases
      const ctxPermanent = permanentCanvas.getContext("2d");
      ctxPermanent.drawImage(img, 0, 0, img.width, img.height);

      const ctxOutput = output.getContext("2d");
      ctxOutput.drawImage(img, 0, 0, img.width, img.height);
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

const startWebcamButton = document.getElementById("startWebcamButton");
const webcamVideo = document.getElementById("webcamVideo");

startWebcamButton.addEventListener("click", startWebcam);

function startWebcam() {
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        webcamVideo.srcObject = stream;
        webcamVideo.style.display = "block";
      })
      .catch(function (error) {
        console.log("Something went wrong!", error);
      });
  }
}

webcamVideo.addEventListener("click", takeScreenshot);

function takeScreenshot() {
  const canvas = document.createElement("canvas");
  canvas.width = webcamVideo.videoWidth;
  canvas.height = webcamVideo.videoHeight;
  canvas
    .getContext("2d")
    .drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);

  // Set canvas dimensions to match video dimensions
  permanentCanvas.width = canvas.width;
  permanentCanvas.height = canvas.height;
  output.width = canvas.width;
  output.height = canvas.height;

  // Draw the image on both canvases
  const ctxPermanent = permanentCanvas.getContext("2d");
  ctxPermanent.drawImage(canvas, 0, 0, canvas.width, canvas.height);

  const ctxOutput = output.getContext("2d");
  ctxOutput.drawImage(canvas, 0, 0, canvas.width, canvas.height);

  saveState(permanentCanvas); // Save state after image is captured
}

const closeWebcamButton = document.getElementById("closeWebcamButton");

closeWebcamButton.addEventListener("click", closeWebcam);

function closeWebcam() {
  if (webcamVideo.srcObject) {
    webcamVideo.srcObject.getTracks().forEach((track) => track.stop());
    webcamVideo.srcObject = null;
    webcamVideo.style.display = "none";
  }
}
