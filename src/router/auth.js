import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

import config from '../config';
import models from '../model';
import logger from '../middleware/logger';

const createToken = async (user, expiresIn) => {
  const { id, username, email, first_name, last_name, status } = user;
  return await jwt.sign({ id, username, email, first_name, last_name, status }, config.secret_key, { expiresIn });
};

const router = Router();

router.post('/login', passport.authenticate('local', { failWithError: true }), async (req, res) => {
  try {
    if (req.user.status >= 2) {
      return res.status(401).send({
        errors: [new Error('This account is blocked, please contact to support.')]
      });
    } else if (req.user.status < 1) {
      return res.status(401).send({
        errors: [new Error('This account isn\'t active. Please check our confirm email in your mailbox or resend.')]
      });
    }

    const token = await createToken(req.user, config.token_expiresin)
    const refresh_token = await createToken(req.user, config.refresh_token_expiresin)

    const { id, username, email, first_name, last_name, status } = req.user;

    await models.UserLogin.create({
      user_id: id,
      refresh_token,
      login_type: 0
    })

    res.status(200).send({
      data: { user: { id, username, email, first_name, last_name, status }, token, refresh_token }
    });
  } catch (err) {
    logger.error('Error on login:', err);
    res.status(500).send({
      errors: [err]
    });
  }
});

router.post('/me', passport.authenticate('jwt', { failWithError: true, session: false }), async (req, res) => {
  const { id, username, email, first_name, last_name, status } = req.user;
  
  res.status(200).send({
    data: { id, username, email, first_name, last_name, status }
  });
});

export default router;