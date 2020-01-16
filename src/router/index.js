
import auth from './auth';

import config from '../config';
import logger from '../middleware/logger';


export default function(app){ 

  app.use('/auth', auth);

  // index.
  app.use('/', function(req, res, next) {
    res.status(200).json({
      app: config.app_name,
      version: 'v1.0'
    });
  });

  // not found error.
  app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handler, if development mode will print stacktrace
  app.use(function(err, req, res, next) {
    logger.error('API response error:', err)
    res.status(err.status || 500);
    res.json({
      errors: [config.env_mode == 'development'? err: { message: err.message || 'Internal Server Error' }]
    });
  });
}