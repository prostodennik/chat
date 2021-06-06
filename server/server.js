const ws = require("ws"); //import WebSocket package
const moment = require("moment");

const wss = new ws.Server(
  {
    port: 5502,
  },
  () => {
    console.log("Server is running on PORT 5502");
  }
);

let users = {
  chatBot: {
    username: "chatBot",
    id: "chatBot",
    avatar: "", //TODO pic from google
  },
};
//let username;

//transform text to objects

function formatMessage(user, text) {
  return {
    userId: user.id,
    username: user.username,
    avatar: user.img || "",
    text,
    time: moment().format("h:mm a"),
  };
}

function userJoin(id, username) {
  const user = { id, username };
  users[id] = user;

  return user;
}

function userList(users) {
  return {
    event: "userList",
    payload: users,
  };
}

wss.on("connection", function connection(ws) {
  ws.on("message", (msg) => {
    const msgObj = JSON.parse(msg);
    switch (msgObj.event) {
      case "username": {
        const username = msgObj.payload;
        const id = moment().format("hhmmss");
        const user = userJoin(id, username);

        wss.clients.forEach((client) => {
          client.send(JSON.stringify(userList(Object.values(users))));
        });

        //welcome current user
        ws.send(
          JSON.stringify(
            formatMessage(
              users.chatBot,
              `${user.username}, welcome to the chat`
            )
          )
        );

        ws.send(JSON.stringify({ event: "setUserId", payload: id }));

        //broadcast to all clients exept joiner, that user has joined
        wss.clients.forEach((client) => {
          if (client !== ws) {
            client.send(
              JSON.stringify(
                formatMessage(
                  users.chatBot,
                  `${user.username} has joined our chat`
                )
              )
            );
          }
        });

        ws.on("close", function () {
          delete users[user.id];

          wss.clients.forEach((client) => {
            client.send(JSON.stringify(userList(Object.values(users))));
            client.send(
              JSON.stringify(
                formatMessage(
                  users.chatBot,
                  `${user.username} has left the chat`
                )
              )
            );
          });
        });
        break;
      }
      case "uploadImage": {
        const user = users[msgObj.userId];
        user.img = msgObj.img;
        wss.clients.forEach((client) => {
          client.send(
            JSON.stringify({
              event: "updateAvatar",
              payload: user.img,
              userId: msgObj.userId,
            })
          );
        });
        break;
      }
      default: {
        wss.clients.forEach((client) => {
          const user = users[msgObj.userId];
          client.send(JSON.stringify(formatMessage(user, msgObj.msg)));
        });
      }
    }
  });
});
