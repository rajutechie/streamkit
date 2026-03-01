import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { storageService } from '../services/storage.js';
import { prisma } from '../lib/prisma.js';

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  size: z.number().int().positive().max(500 * 1024 * 1024), // 500 MB max
});

/* ------------------------------------------------------------------ */
/*  Router                                                            */
/* ------------------------------------------------------------------ */

export const mediaRouter = Router();

/**
 * POST /media/upload
 *
 * Initiate a media upload.  Returns a presigned URL the client can use to
 * PUT the file directly to S3.  Metadata is persisted to the database.
 */
mediaRouter.post('/media/upload', validate(uploadSchema), async (req: Request, res: Response) => {
  const { filename, mimeType, size } = req.body as z.infer<typeof uploadSchema>;

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  try {
    // Generate a temporary key to derive the mediaId from the DB record.
    // We create the DB record first to get the UUID, then build the S3 key.
    const record = await prisma.mediaObject.create({
      data: {
        filename,
        mimeType,
        size,
        s3Key: `pending/${Date.now()}/${sanitizedFilename}`, // placeholder
        uploadUrl: '',
      },
    });

    const key = `${record.id}/${sanitizedFilename}`;
    const uploadUrl = await storageService.generatePresignedUploadUrl(key, mimeType);

    // Update with the real key and upload URL.
    await prisma.mediaObject.update({
      where: { id: record.id },
      data: { s3Key: key, uploadUrl },
    });

    console.log(`[MediaRoutes] Created media entry ${record.id} for "${filename}" (${mimeType}, ${size} bytes)`);

    res.status(201).json({
      mediaId: record.id,
      uploadUrl,
      key,
    });
  } catch (err) {
    console.error('[MediaRoutes] Failed to initiate upload:', err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

/**
 * GET /media/:id
 *
 * Retrieve media metadata by ID.  Returns 404 if not found or soft-deleted.
 * Includes a fresh presigned download URL.
 */
mediaRouter.get('/media/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const record = await prisma.mediaObject.findUnique({ where: { id } });

  if (!record || record.isDeleted) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }

  try {
    const downloadUrl = await storageService.generatePresignedDownloadUrl(record.s3Key);

    res.json({ ...record, downloadUrl });
  } catch (err) {
    console.error('[MediaRoutes] Failed to generate presigned download URL:', err);
    res.json(record);
  }
});

/**
 * DELETE /media/:id
 *
 * Soft-delete a media entry.  The actual S3 object is retained for auditing
 * purposes; a background job would handle hard deletes.
 */
mediaRouter.delete('/media/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const record = await prisma.mediaObject.findUnique({ where: { id } });

  if (!record || record.isDeleted) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }

  await prisma.mediaObject.update({
    where: { id },
    data: { isDeleted: true },
  });

  console.log(`[MediaRoutes] Soft-deleted media ${id}`);
  res.status(204).send();
});
