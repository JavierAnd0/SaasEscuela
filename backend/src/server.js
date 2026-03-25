'use strict';

require('dotenv').config();

const app  = require('./app');
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`[SaasColegio] Backend corriendo en http://localhost:${port}`);
  console.log(`[SaasColegio] Entorno: ${process.env.NODE_ENV || 'development'}`);
});
