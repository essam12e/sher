export type UploadImageInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
};

export type UploadImageResult = {
  storageKey: string;
  publicUrl: string;
};

export interface StorageProvider {
  uploadImage(input: UploadImageInput): Promise<UploadImageResult>;
  deleteImage(key: string): Promise<void>;
  getPublicUrl(key: string): Promise<string>;
  checkImageExists(key: string): Promise<boolean>;
}
