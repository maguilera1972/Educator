const express = require('express');
const { GENERIC_AVATARS, genericAvatarUrl } = require('../lib/avatars');

module.exports = function createAvatarsRouter() {
  const router = express.Router();

  router.get('/generics', (_req, res) => {
    res.json({
      generics: GENERIC_AVATARS.map((g) => ({
        ...g,
        url: genericAvatarUrl(g.id),
      })),
    });
  });

  return router;
};
