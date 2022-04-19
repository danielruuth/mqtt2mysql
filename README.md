# mqtt2mysql
Store mqtt payloads to a mysql db

## Install ##
1. Clone repo
2. chmod +x on the install.js file to allow setup of .env file
3. run ./install.js to create .env file
4. run node index.js firstrun to setup db


## Running ##
Just run npm run start or run it with your favourite daemon process handler (like pm2, https://pm2.io/)

The nodeapp will logg everything that comes to the subscribed topics into the mysqldb, remeber that it's not good practice to subsribe to # since it can overflood easily. Example to store all temperatures would be something like home/#/temperature


### Want to store in some other db format? ###
This little app uses knex for storing, so by changing the knex construnctor in the index.js file would be sufficient to change to any of the dbs supported by knex.
