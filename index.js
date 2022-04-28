require('dotenv').config();
const mqtt = require('mqtt')
const knex = require('knex');
var cors = require('cors');

class mqtt2mysql {
  constructor () {
    this.knex = knex({
    client: 'mysql',
    connection: {
      host : process.env.DB_HOST,
      user : process.env.DB_USER,
      password : process.env.DB_PASSWORD,
      database : process.env.DB_NAME
    }
  });
  }

  firstrun () {
    return new Promise((resolve, reject) =>{
      this.knex.schema
        .createTable('payloads', table => {
          table.increments('id');
          table.string('topic');
          table.string('payload');
          table.timestamp('received_at');
        })
        .createTable('latest', table => {
          table.increments('id');
          table.string('topic');
          table.string('payload');
          table.timestamp('received_at');
        })
        .then(()=>{
          resolve()
        }).catch((error) => {
          throw new Error('database failed to initsialize');
          reject()
        })
      })
  }

  init () {
    console.log('Welcome to mqtt2mysql!')
    console.log(`Connecting to ${process.env.MQTT_HOST}:${process.env.MQTT_PORT}, hold on tight`)
    this.client = mqtt.connect({host: process.env.MQTT_HOST, port: process.env.MQTT_PORT});
    this.client.on('connect', () => {
      console.log(`We are connected to ${process.env.MQTT_HOST}`)
      var topics = process.env.MQTT_TOPICS.split(' ');
      topics.forEach((topic) => {
        console.log(`Subscribing to ${topic}`)
        this.client.subscribe(topic);
      })
    })

    this.client.on('message',( topic, message) => {
      this.storepayload(message.toString(), topic)
    })
    this.client.on('close', () => {
      console.log('Connection to server closed');
    })
    this.client.on('reconnect', () => {
      console.log('Issuing reconnect');
    })

    this.initapi();
  }

  initapi () {
    var express = require("express");
    var app = express();
    app.use(cors());
    app.listen(3000, () => {
     console.log("Server running on port 3000");
    });

    app.get('/topics', (req, res) => {
      this.knex('payloads').select('topic').distinct('topic')
      .then((result) => {
        res.json({data: result});
      })
      .catch((error) => {
        res.json({error: error});
      })
    })
    //Return count number of points from topic
    app.get("/:topic/:count", (req, res, next) => {
      const topic = req.params.topic.replaceAll(':','/');
      const count = req.params.count || 10;
      this.knex('payloads').select().where('topic',topic).orderBy('received_at','desc').limit(count)
      .then((result) => {
        if (result.length > 0) {
          res.json({'data': result});
        } else {
          res.json({'data':[]});
        }
      })
      .catch((error) => {
        res.json({'error':error})
      })
    });

    app.get('/:topic/:startdate/:enddate', (req, res) => {
      const startdate = Math.floor(Date.parse(req.params.startdate)/1000)
      const enddate = Math.floor(Date.parse(req.params.enddate)/1000)
      const topic = req.params.topic.replaceAll(':','/');
      console.log(enddate,startdate)
      if (isNaN(enddate) || isNaN(startdate)) {
        res.json({error:'Unrecognized date format'});
        return;
      }
      this.knex.select().fromRaw("payloads where (received_at between FROM_UNIXTIME(?) and FROM_UNIXTIME(?)) and (topic = ?) order by received_at desc", [startdate, enddate, topic])
      .then((rows) => {
        const result = Object.values(JSON.parse(JSON.stringify(rows)));
        if (result.length > 0) {
          res.json({'data': result});
        } else {
          res.json({'data':[]});
        }
      })
      .catch((error) => {
        res.json({'error':error})
      })
    })
  }

  storepayload (payload, topic) {
    const now = Math.floor( Date.now() / 1000 );
    console.log(`Storing ${payload} fetched from ${topic}`)
    this.knex('payloads').insert(
      {
        topic: topic,
        payload: payload
      }
    )
    .then(() => {
      this.knex('latest')
        .select()
        .where('topic', topic)
        .then((rows) => {
          if (rows.length===0) {
            // no matching records found, insert
            this.knex('latest').insert({'topic': topic, 'payload': payload})
          } else {
            // update
            this.knex('latest').where({ 'topic': topic }).update({'payload': payload})
          }
        })
        .catch(function(error) {
          // you can find errors here.
          console.log(error)
          throw new Error('could not store latest');
        })
    }).catch((error) => {
      console.log(error)
    })
  }
}
const Args = process.argv.slice(2);
const App = new mqtt2mysql();

switch (Args[0]) {
  case 'firstrun':
    App.firstrun().then(()=>{
      console.log('Database has been initsialized!');
      App.init();
    })
    break;
  default:
    App.init()
}
