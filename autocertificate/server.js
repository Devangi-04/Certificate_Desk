require('dotenv').config();
require('express-async-errors');

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');

const apiRouter = require('./src/routes');
const { ensureStorageDirectories } = require('./src/utils/fileStorage');
const { errorHandler, notFoundHandler } = require('./src/utils/response');

const app = express();
const PORT = process.env.PORT || 4000;

ensureStorageDirectories();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/storage', express.static(path.join(__dirname, 'storage')));
// Serve pdfjs-dist build under /vendor so pdf.min.js and pdf.worker.min.js are available
app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Certificate automation server running on http://localhost:${PORT}`);
});
