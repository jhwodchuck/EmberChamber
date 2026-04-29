import { Router, Response, Request, NextFunction } from "express";
import multer from "multer";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";
import { query } from "../db/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

const MAX_FILE_SIZE =
  parseInt(process.env.MAX_FILE_SIZE_MB ?? "50") * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
    forcePathStyle: !!process.env.S3_ENDPOINT, // needed for MinIO/local
  });
}

const BUCKET = process.env.S3_BUCKET ?? "emberchamber";

// POST /api/attachments/upload
router.post(
  "/upload",
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw createError("No file uploaded", 400);
      }

      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const storageKey = `uploads/${req.userId}/${crypto.randomUUID()}${fileExt}`;

      const s3 = getS3Client();

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: storageKey,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ContentDisposition: `attachment; filename="${req.file.originalname}"`,
          ServerSideEncryption: "AES256",
          Metadata: {
            "uploader-id": req.userId!,
            "original-name": req.file.originalname,
          },
        }),
      );

      const result = await query(
        `INSERT INTO attachments (uploader_id, file_name, file_size, mime_type, storage_key)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, file_name, file_size, mime_type, created_at`,
        [
          req.userId,
          req.file.originalname,
          req.file.size,
          req.file.mimetype,
          storageKey,
        ],
      );

      const attachment = result[0];

      // Generate a pre-signed URL valid for 1 hour
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }),
        { expiresIn: 3600 },
      );

      res.status(201).json({
        data: {
          ...attachment,
          url: signedUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/attachments/:id/url - get a fresh signed URL
router.get("/:id/url", async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const attachment = await query<{
      id: string;
      uploader_id: string;
      storage_key: string;
      file_name: string;
      mime_type: string;
    }>(
      "SELECT id, uploader_id, storage_key, file_name, mime_type FROM attachments WHERE id = $1",
      [id],
    );

    if (!attachment.length) throw createError("Attachment not found", 404);

    const att = attachment[0];

    const s3 = getS3Client();
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: att.storage_key }),
      { expiresIn: 3600 },
    );

    res.json({
      data: {
        url: signedUrl,
        fileName: att.file_name,
        mimeType: att.mime_type,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
