import express from 'express';
import fs from 'fs';
import path from "path";
import https from 'https';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';

import config from './config';
import { sequelize } from './model';
import router from './router';
import passport from './middleware/passport';
import logger from './middleware/logger';

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(helmet())
app.use(passport)
app.use('/public', express.static(path.join(__dirname, '../public')))
router(app)

// Create the HTTPS or HTTP server, per configuration
var server
if (config.ssl) {
  // Assumes certificates are in .ssl folder from package root. Make sure the files are secured.
  server = https.createServer(
    {
      key: fs.readFileSync(path.join(__dirname, './ssl/server.key')),
      ca: fs.readFileSync(path.join(__dirname, './ssl/server.ca-bundle')),
      cert: fs.readFileSync(path.join(__dirname, './ssl/server.crt'))
    },
    app
  )
} else {
  server = http.createServer(app)
}

sequelize.sync({force: false}).then(() => {
  logger.info('Connected to database')

  app.listen({ port: config.port }, () =>
    logger.info(
      `🚀 Server ready at: http${config.ssl ? 's' : ''}://${config.hostname}:${config.port}`
    )
  )
})