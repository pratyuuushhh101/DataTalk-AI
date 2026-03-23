import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";

dotenv.config();

export const uploadToBlob = async (file) => {
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    console.warn("AZURE_STORAGE_CONNECTION_STRING is not set. Skipping blob upload.");
    return `skipping_blob_upload-${Date.now()}-${file.originalname}`;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );

  const containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER
  );

  const blobName = `${Date.now()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadFile(file.path);

  return blobName;
};