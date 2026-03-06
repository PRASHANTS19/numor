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
      console.log('File type not allowed, Mimetype - ', file.mimetype," Ext - ", ext);
      cb(
        new Error(
          'Only PDF, Image (PNG/JPG/JPEG/JFIF), and Excel (XLS/XLSX) and CSV files are allowed'
        )
      );
    }
  }
});


/* ================================
   NEW STORAGE FOR CA DOCUMENTS
   (Supabase Upload)
================================ */
const caMemoryStorage = multer.memoryStorage();

const caUpload = multer({
  storage: caMemoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});


/* ================================
   COMMON FILE FILTER
================================ */

function fileFilter(req, file, cb) {

  const allowedExt = [
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.jfif'
  ];

  const allowedMimeTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/pjpeg'
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
        'Only PDF, PNG, JPG, JPEG files are allowed for CA uploads'
      )
    );
  }
}


module.exports = {
  upload,     
  caUpload   
};