import Sequelize from 'sequelize';

import config from '../config';
import generateRedisModel from '../middleware/redismodel';

import activation from './activation';
import user from './user';
import userLogin from './user_login';

let sequelize = new Sequelize(
  config.db_name,
  config.db_user,
  config.db_pass,
  {
    host: config.db_host,
    port: config.db_port,
    dialect: config.db_dialect,
    pool: {
      max: 20,
      min: 0,
      idle: 10000
    },
    logging: false,
  },
);

Sequelize.filter = (aggregation, filters, model) => {
  const filterFn = Array.isArray(filters)
    ? filters.length === 1
      ? filters[0]
      : Sequelize.and(...filters)
    : filters

  if (!filterFn) throw new Error('Missing filters!')
  if (!aggregation) throw new Error('Missing aggregation!')

  const query = sequelize.dialect.QueryGenerator.getWhereConditions(filterFn, model.name, model)
  const agg = sequelize.dialect.QueryGenerator.handleSequelizeMethod(aggregation, model.name, model)
  return Sequelize.literal(`${agg} FILTER (WHERE ${query})`)
}

Sequelize.Model.upsert = function (values, options) {
  const Model = this;
  return Model
    .findOne(options)
    .then(function(obj) {
      if(obj) { // update
        return obj.update(values);
      }
      else { // insert
        return Model.create(values);
      }
    })
}

const models = {};
models.Activation = activation(sequelize, Sequelize)
models.User = user(sequelize, Sequelize)
models.UserLogin = userLogin(sequelize, Sequelize)

if (config.use_redis) {
  // define cached models
  models.User = generateRedisModel(models.User);
}

// Forign keys
models.User.hasMany(models.Activation, { as: 'activation', foreignKey: 'user_id' })
models.Activation.belongsTo(models.User, { foreignKey: 'user_id' })

models.User.hasMany(models.UserLogin, { foreignKey: 'user_id' })
models.UserLogin.belongsTo(models.User, { foreignKey: 'user_id' })

Object.keys(models).forEach(key => {
  if ('associate' in models[key]) {
    models[key].associate(models);
  }
});

models.transaction = async (option) => {
  return await sequelize.transaction(option)
}

export { sequelize };

export default models;