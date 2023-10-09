// Firebase https function to convert an image to pdf and store in cloud storage
// Auther: Shubhankar Solanki
// Project: Test task

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

admin.initializeApp({
  projectId: "image-pdf-1e2e8",
  storageBucket: "gs://image-pdf-1e2e8.appspot.com",
});

const fileName = "pdf.png";

const serviceKey = path.join(__dirname, "/key.json");

const storage = new Storage({
  projectId: "storage-demo-401218",
  keyFilename: serviceKey,
});

// file upload from local path
const uploadFileToBucket = (localFilePath) => {
  try {
    const bucket = storage.bucket("image-file-upload-demo");
    const options = {
      destination: fileName,
    };
    return bucket.upload(localFilePath, options);
  } catch (error) {
    logger.error("there was an error while uploading file to bucket!", error);
    throw error;
  }
};

//Another version of file upload with stream data
const uploadBuffer = (fileBuffer) => {
  try {
    const bucket = storage.bucket("image-file-upload-demo");
    const myPdf = bucket.file("my-pdf.pdf");

    return myPdf
      .createWriteStream({
        metadata: {
          contentType: "application/pdf",
        },
      })
      .on("error", function (err) {
        logger.error("Error while file buffer upload", error);
      })
      .on("finish", function () {
        logger.log("File buffer uploaded successfully.");
      })
      .end(fileBuffer);
  } catch (error) {
    logger.error("There was an error while uploading file to bucket!", error);
    throw error;
  }
};

const convertImageToPdfAndUpload = async (imagePath) => {
    try {
      const image = await loadImage(imagePath);
      const canvas = new createCanvas(image.width, image.height, "pdf");
      const ctx = canvas.getContext("2d");
      
      ctx.drawImage(image, 0, 0, image.width / 2, image.height / 2);
      return uploadBuffer(canvas.toBuffer());
    } catch (error) {
      logger.error("Error in convert image to pdf", error);
    }
  };

const writeHelloWorldOnImage = (imageAbsolutePath, res) => {
  // get file path

  return loadImage(imageAbsolutePath)
    .then((image) => {
      logger.log("image loaded", image.height);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");

      // Write "Hello world" to canvas
      ctx.drawImage(image, 0, 0, image.width, image.height);
      ctx.font = "40px bold Impact";
      ctx.fillStyle = "#FF0000";
      ctx.fillText("Hello world!!", 200, 200);

      const pdfAbsolutePath = path.resolve("./resources/images/");
      const newImageFilePath = pdfAbsolutePath + `/${fileName}`;
      const out = fs.createWriteStream(newImageFilePath);

      const stream = canvas.createPNGStream();
      stream.pipe(out);

      out.on("finish", async() => {
        logger.info("png file created with hello world!");

        try {
            await convertImageToPdfAndUpload(newImageFilePath);
            res.status(200).send("Your request is processed!");
        } catch (error) {
            res.status(500).send("Not able to process!");
        }
      });
    })
    .catch((err) => {
      logger.error("!failed to load image", err);
      res.status(500).send("There was a server issue!");
    });
};


// Firebase function to which will invoke via https request and serve a response
exports.imageToPdf = onRequest((req, res) => {
  logger.info("Image to pdf function call initiated!!");
  try {
    const imageAbsolutePath = path.resolve("./resources/images/download1.jpg"); // get image that we want to modify
    writeHelloWorldOnImage(imageAbsolutePath, res);
  } catch (error) {
    logger.log("There was an unexpected error!", error);
    res.status(500).send("there was an issue, please try again!");
  }
});
