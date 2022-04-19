#!/usr/bin/env node

//Create a dotenv file
const fs = require('fs')
const readline = require('readline')
const inquirer = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var settings = {
  'DB_HOST':null,
  'DB_NAME':null,
  'DB_USER': null,
  'DB_PASSWORD': null,
  'MQTT_HOST': null,
  'MQTT_PORT': null,
  'MQTT_TOPICS': null
}

function ask () {
  inquirer.question("Please enter DB Host: ", name => {
    settings.DB_HOST = name;
    inquirer.question("Please enter a DB name", dbname => {
      settings.DB_NAME = dbname;
      inquirer.question("Please enter DB username: ", user => {
        settings.DB_USER = user;
        inquirer.question("Please enter DB user password: ", password => {
          settings.DB_PASSWORD = password
          inquirer.question("Please enter MQTT host: ", host => {
            settings.MQTT_HOST = host;
            inquirer.question("Please enter MQTT port: ", port => {
              settings.MQTT_PORT = port;
              inquirer.question("Please enter MQTT topics to store to MySQL, seperated by space [ ]: ", topics => {
                settings.MQTT_TOPICS = topics
                console.log(settings)
                inquirer.question("Is this correct? y/n: ", correct => {
                  if (correct == 'y'){
                    var content = "";
                    for(const prop in settings){
                      content += `${prop}=${settings[prop]}\n`;
                    }
                    console.log(content);
                    fs.writeFile('.env', content, err => {
                      if (err) {
                        console.error(err)
                      }
                      console.log(".env file created!")
                      inquirer.close();
                    })

                  }else{
                    inquirer.close();
                    ask()
                  }
                })
              })
            })
          })
        })
      })
    })
  })
}

ask();

inquirer.on("close", function() {
  console.log("Good bye!");
  process.exit(0);
});
