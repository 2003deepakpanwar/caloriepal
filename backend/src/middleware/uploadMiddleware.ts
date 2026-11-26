import multer from 'multer';

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.mimetype)) {
      cb(new Error('Unsupported image type'));
      return;
    }
    cb(null, true);
  },
});
