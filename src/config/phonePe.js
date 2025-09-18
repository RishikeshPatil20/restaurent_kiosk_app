// backend/src/config/phonePe.js
// currently using razorpay
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

export const phonePeConfig = {
  merchantId: process.env.PHONEPE_MERCHANT_ID,
  saltKey: process.env.PHONEPE_SALT_KEY,
  saltIndex: process.env.PHONEPE_SALT_INDEX,
  baseUrl: process.env.PHONEPE_BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox",
  apiEndpoint: "/pg/v1/pay",
};

// Generate checksum for PhonePe requests
export const generateChecksum = (payloadBase64) => {
  const stringToSign = payloadBase64 + phonePeConfig.apiEndpoint + phonePeConfig.saltKey;
  const checksum = crypto.createHash("sha256").update(stringToSign).digest("hex");
  return `${checksum}###${phonePeConfig.saltIndex}`;
};
