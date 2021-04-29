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

router.post('/signup', async (req, res) => {
  const { username, password, first_name, last_name, email } = req.body;

  const schema = Joi.object().keys({
    username: Joi.string()
      .regex(/^(?=.{4,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/)
      .required(),
    password: Joi.string().min(3).max(30).required(),
    first_name: Joi.string().max(15).required(),
    last_name: Joi.string().max(15).required(),
    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .min(3)
      .max(30)
      .required(),
  });

  try {
    Joi.assert({ username, password, first_name, last_name, email }, schema, {
      abortEarly: false,
    });
  } catch (err) {
    const errors = err.details.map((error) => ({ message: error.message }));
    return res.status(403).send({
      errors,
    });
  }

  try {
    const duplication = await models.User.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });
    if (duplication) {
      return res.status(403).send({
        errors: [
          {
            message: `${
              duplication.username === username ? 'Username' : 'Email'
            } is already exist`,
          },
        ],
      });
    }

    const result = await models.User.create({
      username,
      password,
      first_name,
      last_name,
      email,
      status: 0,
    });
    const user = result.get({ plain: true });

    const token = await createToken(user, config.token_expiresin);
    const refresh_token = await createToken(
      user,
      config.refresh_token_expiresin
    );

    const { id, photo, status } = user;

    await models.UserLogin.create({
      user_id: id,
      refresh_token,
      login_type: 0,
    });

    res.status(200).send({
      data: {
        user: {
          id,
          username,
          email,
          first_name,
          last_name,
          photo,
          status,
        },
        token,
        refresh_token,
      },
    });
  } catch (err) {
    logger.error('Error on signup:', err);
    res.status(500).send({
      errors: [err],
    });
  }
});

router.post('/me', passport.authenticate('jwt', { failWithError: true, session: false }), async (req, res) => {
  const { id, username, email, first_name, last_name, status } = req.user;
  
  res.status(200).send({
    data: { id, username, email, first_name, last_name, status }
  });
});

router.post('/logout', passport.authenticate('jwt', { failWithError: true, session: false }), async (req, res) => {
  const { refresh_token } = req.body;

  const schema = Joi.object().keys({
    refresh_token: Joi.string().required(),
  });

  try {
    Joi.assert({ refresh_token }, schema, { abortEarly: false });
  } catch (err) {
    const errors = err.details.map((error) => ({ message: error.message }));
    return res.status(403).send({
      errors,
    });
  }

  try {
    const { id } = req.user;
    const userLogin = await models.UserLogin.findOne({
      where: { user_id: id, refresh_token },
    });

    if (!userLogin) {
      return res.status(403).send({
        errors: [
          {
            message: `No account found with this refresh token: ${refresh_token}`,
          },
        ],
      });
    }

    await userLogin.update({ status: 3 });

    req.logout();
    res.status(200).send({ data: 'Success' });
  } catch (err) {
    logger.error('Error on logout:', err);
    res.status(500).send({
      errors: [err],
    });
  }
});

export default router;