# RESTful API Node Server Boilerplate
A boilerplate/starter project for quickly building RESTful APIs using Node.js, Express and MySQL.


## Features

- Express
- MySQL
- Sequelize
- Redis
- Helmet
- Bcrypt
- Joi
- Passport
- Dontenv / Lodash / Moment
- Babel 7 / Webpack

## Requirements
- [NodeJS v8 or higher](https://nodejs.org/en/)
- [MySQL v5.7 or higher](https://www.mysql.com/)
- [Redis v5 or higher](https://redis.io/)

## Installation

- Install all the node packages listed in the package.json  
  `npm install`
- Replace **.env.example** to **.env** and complete MySQL database and redis server connection details
- Prepare database (create tables and populate)

## Run the node server
### Development
- Run node server  
  `npm start`

### Production
- Pack and minimize source codes  
  `npm run build`
- Run node server as daemon  
  `pm2 start build/index.js`
