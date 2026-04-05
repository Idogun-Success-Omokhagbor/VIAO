import { z } from "zod"

import {
  MAX_IMAGE_DATA_URL_LENGTH,
  isAllowedUserProvidedImageUrl,
  parseStoredImageDataUrl,
} from "@/lib/image-utils"

export const imageUploadDataUrlSchema = z
  .string()
  .max(MAX_IMAGE_DATA_URL_LENGTH)
  .refine((value) => parseStoredImageDataUrl(value) !== null, "Unsupported image upload")

export const storedImageInputSchema = z
  .string()
  .refine(
    (value) => (value.startsWith("data:") ? parseStoredImageDataUrl(value) !== null : isAllowedUserProvidedImageUrl(value)),
    "Image URL must use HTTPS or be a supported uploaded image",
  )
