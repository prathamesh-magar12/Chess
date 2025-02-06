//server-side

const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};
let currentPlayer = "W";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Custom chess game" });
});

io.on("connection", (uniquesocket) => {
  console.log("Connected");

  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("spectatorRole");
  }

  uniquesocket.on("disconnect", () => {
    console.log(`Socket ${uniquesocket.id} disconnected`);

    //Remove disconnected player
    if (uniquesocket.id === players.white) {
      delete players.white;
      console.log("White player disconnected");
      io.emit("playerLeft", { role: "w" });
    } else if (uniquesocket.id === players.black) {
      delete players.black;
      console.log("Black player disconnected");
      io.emit("playerLeft", { role: "b" });
    }

    //Notify all clients about the updated player roles
    io.emit("updateRoles", players);
  });

  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("Invalid move: ", move);
        uniquesocket.emit("invalidMove", move);
      }
    } catch (err) {
      console.log(err);
      uniquesocket.emit("invalidMove", move);
    }
  });
});

server.listen(3000, () => {
  console.log("listning on port 3000");
});
