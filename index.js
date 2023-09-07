const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const router = require("./router/router");
const cors = require("cors");
const cookie = require("cookie-parser");
const ws = require("ws");
const jwt = require("jsonwebtoken");
const Message = require("./models/message");
const fs = require('fs')
const jwtSecret = process.env.JWT_TOKEN || "suryaperumal";
dotenv.config();

app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(cookie()); 
app.use(express.json());  

app.use(
  cors({
    credentials: true,  
    origin: "https://chatclient.netlify.app/",
  })
);

app.use(express.urlencoded({ extended: false }));

const DB = process.env.DB_URL;
const Port = process.env.PORT;

mongoose.connect(DB, { useNewUrlParser: true });

const connect = mongoose.connection;

try {
  connect.on("open", () => {
    console.log("mongoose is connected");
  });
} catch (err) {
  console.log("mongoose error", err);
}

app.use("/users", router);

app.get("/", (req, res) => {
  res.json("server is ok");
});


const server = app.listen(Port);

const wss = new ws.WebSocketServer({ server });

wss.on("connection", (connection, req) => { 
  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      connection.terminate();
      clearInterval(connection.timer)
      notify();
      console.log('death')
    }, 1000);
  }, 5000);

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  const notify = () => {
    [...wss.clients].forEach((clients) => {
      clients.send(
        JSON.stringify({
          online: [...wss.clients].map((data) => ({
            userId: data.userId,
            username: data.username,
          })),
        })
      );
    });
  }

  //read username and id from the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on("message", async (message) => {
    message = JSON.parse(message.toString());
    // console.log(message)
    let filename = null;
    const { recipient, text, file } = message;
    if(file) {
    const parts = file.name.split('.');
    const last = parts[parts.length -1];
     filename = Date.now() + '.' + last 
    const path = __dirname + '/uploads/'+filename
    const buffer = new Buffer(file.data.split(',')[1], 'base64');
    fs.writeFile(path,buffer, ( ) => { 
      console.log('file saved :' +path)
    
    })
  }
    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file : file ? filename : null
      });
      [...wss.clients]
        .filter((e) => e.userId === recipient)
        .forEach((e) =>
          e.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              file : file ? filename : null,
              _id: messageDoc._id,
            })
          )
        );
    }
  });

  //notify everyone about online (when someone connect)
  //   console.log([...wss.clients].map((data) => data.username))
    notify()
});

