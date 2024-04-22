const PROTO_PATH = __dirname + '/../proto/example.proto';

const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const responseTime = require('response-time');

const session = require('express-session');
const redis = require('redis');
const connectRedis = require('connect-redis');
const cors = require('cors');
var bodyParser = require('body-parser');


const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    }
);

const example = grpc.loadPackageDefinition(packageDefinition).example;
const client = new example.Example("server:50051", grpc.credentials.createInsecure());

const app = express();
// conexion con redis
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const RedisStore = connectRedis(session);

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,   
    port: 6379
});

redisClient.on("error", function(error) {
    console.error(error);
});



app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'mysecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000
    }
}));

app.use(express.json());
app.use(responseTime());
// metodos
app.get("/personas/all", async (_, res) => {
    client.getAll({}, (err, list) => {
        if (err) {
            console.log(err);
            res.json({});
        }
        
        client.set("personas", JSON.stringify(list.list), (err, reply) => {
            res.json(list.list);
        });
        
    });
});

app.get("/personas", async (req, res) => {
    const id = Number(req.query.id);

    client.GetById({ id: id }, (err, persona) => {
        if (err) {
            console.log(err);
            res.json({});
        }

        res.json(persona);
    })
});

app.listen(3000, () => {
    console.log("API running at port 3000");
})
