/**
 * GCP Cloud Storage export via Service Account.
 * User provides their own service account key and bucket name.
 * Service account key is encrypted before storage.
 */

import { Storage } from "@google-cloud/storage";
import type { ProjectDoc, ContactDoc } from "@/lib/firebase/types";
import crypto from "crypto";

type ContactWithId = ContactDoc & { id: string };

// Encryption key - MUST be set in environment variables
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY) {
  console.warn("[GCP] INTEGRATION_ENCRYPTION_KEY not set. GCP credentials encryption will not work.");
}

/**
 * Encrypt service account key
 */
function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY not configured");
  }
  const key = ENCRYPTION_KEY.length >= 64 
    ? Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex")
    : crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt service account key
 */
function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY not configured");
  }
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }
  const key = ENCRYPTION_KEY.length >= 64 
    ? Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex")
    : crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Get Storage client from encrypted service account key
 */
export function getStorageClient(encryptedServiceAccountKey: string): Storage {
  try {
    const decrypted = decrypt(encryptedServiceAccountKey);
    const credentials = JSON.parse(decrypted);
    return new Storage({ credentials });
  } catch (error) {
    throw new Error(`Failed to decrypt or parse GCP service account key: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Build CSV content from project and contacts
 */
function buildCSVContent(
  project: ProjectDoc & { id: string },
  contacts: ContactWithId[],
  filterFailed: boolean
): string {
  const captureLabels = project.captureFields?.map((f) => f.label) ?? [];
  const headers = [
    "Phone",
    "Name",
    "Status",
    "Duration (s)",
    "Date",
    ...captureLabels,
    "Transcript",
    "Recording",
  ];
  
  const list = filterFailed
    ? contacts.filter((c) => c.status === "failed")
    : contacts;
  
  const rows = list.map((c) => {
    const call = c.callResult;
    const date = call?.attemptedAt
      ? new Date(call.attemptedAt).toISOString().slice(0, 10)
      : "";
    const duration = call?.durationSeconds ?? "";
    const captureVals =
      project.captureFields?.map((f) => String(call?.capturedData?.[f.key] ?? "")) ?? [];
    
    // Escape CSV values
    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    
    return [
      c.phone,
      c.name ?? "",
      c.status,
      String(duration),
      date,
      ...captureVals,
      call?.transcript ?? "",
      call?.recordingUrl ?? "",
    ].map(escapeCSV).join(",");
  });
  
  return [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
}

/**
 * Export project data to GCP Cloud Storage bucket
 */
export async function exportToGCPBucket(
  project: ProjectDoc & { id: string },
  contacts: ContactWithId[],
  bucketName: string,
  encryptedServiceAccountKey: string,
  filterFailed = false
): Promise<{ fileUrl: string; fileName: string }> {
  const storage = getStorageClient(encryptedServiceAccountKey);
  const bucket = storage.bucket(bucketName);
  
  // Generate filename: project-name-export-YYYY-MM-DD-HHMMSS.csv
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const safeProjectName = (project.name || "project").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const fileName = `${safeProjectName}-export-${timestamp}.csv`;
  
  const csvContent = buildCSVContent(project, contacts, filterFailed);
  const file = bucket.file(fileName);
  
  await file.save(csvContent, {
    contentType: "text/csv",
    metadata: {
      contentType: "text/csv",
      cacheControl: "public, max-age=3600",
    },
  });
  
  // Make file publicly readable (optional - user can configure bucket permissions)
  // await file.makePublic();
  
  const fileUrl = `gs://${bucketName}/${fileName}`;
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
  
  return {
    fileUrl: publicUrl, // Return public URL if bucket is public, otherwise gs:// URL
    fileName,
  };
}

/**
 * Encrypt service account key for storage
 */
export function encryptServiceAccountKey(key: string): string {
  return encrypt(key);
}
