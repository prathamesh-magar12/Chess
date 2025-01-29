const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const restartButton = document.getElementById("restart-game");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

socket.on("gameOver", (data) => {
  // Show restart button
  restartButton.style.display = "block";

  restartButton.addEventListener("click", () => {
    socket.emit("restartGame");
    restartButton.style.display = "none";
  });
});

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const flippedRow = 7 - rowindex;
      const flippedCol = 7 - squareindex;
      const row = playerRole === "b" ? flippedRow : rowindex;
      const col = playerRole === "b" ? flippedCol : squareindex;

      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(sourceSquare, targetSource);
        }
      });
      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

// const handleMove = (source, target) => {
//   const move = {
//     from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
//     to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
//     promotion: "q",
//   };
//   socket.emit("move", move);
// };
const handleMove = (source, target) => {
  const fromRow = playerRole === "b" ? 7 - source.row : source.row;
  const fromCol = playerRole === "b" ? 7 - source.col : source.col;
  const toRow = playerRole === "b" ? 7 - target.row : target.row;
  const toCol = playerRole === "b" ? 7 - target.col : target.col;

  const move = {
    from: `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`,
    to: `${String.fromCharCode(97 + toCol)}${8 - toRow}`,
    promotion: "q", // Auto-queen for now
  };
  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♟︎",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  return unicodePieces[piece.type] || "";
};

socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();

  // Remove existing messages
  const existingMessage = document.getElementById("spectator-message");
  if (existingMessage) existingMessage.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div id="spectator-message" style="
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 16px;
    ">You are a spectator</div>`
  );
});

// Remove spectator message when the role changes
socket.on("playerRole", function (role) {
  playerRole = role;
  renderBoard();
  const spectatorMessage = document.getElementById("spectator-message");
  if (spectatorMessage) {
    spectatorMessage.remove();
  }
});

socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();
});

// socket.on("move", function (move) {
//   chess.move(move);
//   renderBoard();
// });
let capturedPieces = { w: [], b: [] };
socket.on("move", function (move) {
  const previousBoard = chess.fen();
  const result = chess.move(move);

  if (result.captured) {
    capturedPieces[result.color === "w" ? "b" : "w"].push(result.captured);
  }

  renderBoard();
  updateCapturedPieces();
});
function updateCapturedPieces() {
  document.getElementById("captured-white").innerText =
    capturedPieces.w.join(" ");
  document.getElementById("captured-black").innerText =
    capturedPieces.b.join(" ");
}

socket.on("gameOver", (data) => {
  let message;
  if (data.reason === "checkmate") {
    message = `Game Over! ${data.winner} wins by checkmate!`;
  } else if (data.reason === "stalemate") {
    message = "Game Over! It's a stalemate!";
  } else if (data.reason === "draw") {
    message = "Game Over! The game is a draw.";
  }

  alert(message); // Notify players of the game outcome

  // Show restart button
  restartButton.style.display = "block";

  // Fix: Remove previous event listeners before adding a new one
  restartButton.replaceWith(restartButton.cloneNode(true));
  restartButton = document.getElementById("restart-game");

  restartButton.addEventListener("click", () => {
    socket.emit("restartGame");
    restartButton.style.display = "none";
  });
});

renderBoard();
