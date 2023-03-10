const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const mqtt = require("mqtt");
const { Sequelize, DataTypes } = require("sequelize");
const log = require("fancylog");

const app = express();
const port = 8080;
app.use(morgan("combined"));
app.use(helmet());
app.use(bodyParser.json());

const postgres = new Sequelize(
  "postgres://postgres:test123@localhost:31000/postgres"
);

const DhtLog = postgres.define("dht_log", {
  clientid: DataTypes.STRING,
  temperature: DataTypes.DOUBLE,
  humidity: DataTypes.DOUBLE,
  timestamp: DataTypes.DATE,
});

const mqttClient = mqtt.connect("mqtt://localhost:1883");

mqttClient.on("connect", () => {
  mqttClient.subscribe("dht");
});

mqttClient.on("message", async (_, message) => {
  await DhtLog.create(JSON.parse(message));
});

app.get("/api/dht", async (_, res) => {
  const dhtLogs = await DhtLog.findAll();
  res.send(dhtLogs);
});

app.post("/api/dht", async (req, res) => {
  log.info(`Pushed entry to queue ${JSON.stringify(req.body)}`);
  mqttClient.publish("dht", JSON.stringify(req.body));
  res.status(202).send();
});

app.listen(port, async () => {
  console.log(`Example app listening on port ${port}`);

  try {
    await postgres.authenticate();
    await postgres.sync();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
});
