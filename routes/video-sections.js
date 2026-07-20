const express = require('express');
const createMaterialSectionsRouter = require('./material-sections');

module.exports = function createVideoSectionsRouter(db) {
  const router = express.Router({ mergeParams: true });
  const inner = createMaterialSectionsRouter(db);

  router.use((req, _res, next) => {
    if (req.method === 'GET' && !req.query.type) req.query.type = 'videos';
    if (req.method === 'POST' && req.body && !req.body.type) req.body.type = 'videos';
    next();
  });
  router.use(inner);
  return router;
};
