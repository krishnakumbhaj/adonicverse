import { Schema } from 'mongoose';

/** An image saved by the storage driver. `key` is what the driver needs to delete it later. */
export interface StoredImage {
  url: string;
  key: string;
  width: number;
  height: number;
}

export const ImageSchema = new Schema<StoredImage>(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false },
);

/**
 * Text index options that work for any language (Hindi, Gujarati, ...).
 * Without `language_override`, a `language` field such as "hi" makes MongoDB reject the document.
 */
export const multilingualTextIndex = {
  default_language: 'none',
  language_override: 'textSearchLanguage',
} as const;
