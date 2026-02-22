const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedExt = [
      '.pdf',
      '.png',
      '.jpg',
      '.jpeg',
      '.jfif',
      '.xls',
      '.xlsx',
      '.csv'
    ];

    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/pjpeg',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'application/octet-stream'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    console.log("Extension:", ext);
    console.log("MimeType:", file.mimetype);

    if (
      allowedExt.includes(ext) &&
      allowedMimeTypes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Only PDF, Image (PNG/JPG/JPEG/JFIF), and Excel (XLS/XLSX) and CSV files are allowed'
        )
      );
    }
  }
});
module.exports = upload;
