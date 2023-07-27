import readline from "readline";
import chalk from "chalk";

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

type IName = "king" | "queen" | "knight" | "bishop" | "rook" | "pawn";
type IColor = "white" | "black";
enum Notation {
  king = "K",
  queen = "Q",
  rook = "R",
  knight = "K",
  pawn = "P",
  bishop = "B",
}
type IBoardCoordinate = { row: number; col: number }; //1-indexed

class Piece {
  private _score: number;
  private _name: IName;
  private _color: IColor;
  private _notation: Notation;
  private _canJump: boolean = false;
  hasMovedOnce: boolean = false;

  constructor(name: IName, color: IColor) {
    this._name = name;
    this._color = color;

    switch (name) {
      case "king":
        this._score = Infinity;
        this._notation = Notation.king;
        break;
      case "queen":
        this._score = 10;
        this._notation = Notation.queen;
        break;
      case "rook":
        this._score = 5;
        this._notation = Notation.rook;
        break;
      case "knight":
        this._score = 3;
        this._notation = Notation.knight;
        this._canJump = true;
        break;
      case "bishop":
        this._score = 3;
        this._notation = Notation.bishop;
        break;
      case "pawn":
        this._score = 1;
        this._notation = Notation.pawn;
        break;
      default:
        throw Error("Invalid Chess Piece Name");
    }
  }

  get notation() {
    return this._notation;
  }

  get color() {
    return this._color;
  }

  get name() {
    return this._name;
  }

  get canJump() {
    return this._canJump;
  }
}

class Board {
  public _board = new Array<0 | Piece>(8 * 8).fill(0);
  private _highlightedCell: IBoardCoordinate = { row: 7, col: 5 };
  private _selectedCell: IBoardCoordinate | undefined;
  private _highlightedMoves: IBoardCoordinate[] = [];
  private _debugList: any[] = [];

  get rawBoard() {
    return this._board;
  }

  get highlightedCell() {
    return `row: ${this._highlightedCell.row}, col: ${this._highlightedCell.col} - (1-indexed) `;
  }

  get selectedCell() {
    return this._selectedCell;
  }

  get moveMode() {
    return this._highlightedMoves.length > 0;
  }

  arrangeBoard() {
    const arrangement: IName[] = [
      "rook",
      "knight",
      "bishop",
      "queen",
      "king",
      "bishop",
      "knight",
      "rook",
    ];
    //black mercernaries
    for (let col = 1; col <= 8; col++) {
      const piece = new Piece(arrangement[col - 1], "black");
      this._board[convert2DIndexTo1D(1, col)] = piece;
    }

    //black pawns
    for (let col = 1; col <= 8; col++) {
      const piece = new Piece("pawn", "black");
      this._board[convert2DIndexTo1D(2, col)] = piece;
    }

    //white pawns
    for (let col = 1; col <= 8; col++) {
      const piece = new Piece("pawn", "white");
      this._board[convert2DIndexTo1D(7, col)] = piece;
    }

    //white mercernaries
    for (let col = 1; col <= 8; col++) {
      const piece = new Piece(arrangement[col - 1], "white");
      this._board[convert2DIndexTo1D(8, col)] = piece;
    }
  }

  drawBoard() {
    console.clear();
    let result = "";

    for (let row = 1; row <= 8; row++) {
      let rowString = "";
      for (let col = 1; col <= 8; col++) {
        const cellNumber = (row - 1) * 8 + col - 1;
        const cell = this._board[cellNumber];
        let cellString: string = "0";
        if (cell instanceof Piece) {
          cellString = cell.notation;
        } else {
          cellString = cell.toString();
        }
        if (cellString === "0") {
          cellString = " ";
        }
        cellString = cellStringWrap(cellString);

        //handle selection
        if (
          !!this._selectedCell &&
          row === this._selectedCell.row &&
          col === this._selectedCell.col
        ) {
          cellString = selectCellString(cellString);
        }

        //handle highlighting
        if (
          row === this._highlightedCell.row &&
          col === this._highlightedCell.col
        ) {
          cellString = highlightCellString(cellString);
        }

        // handle move highlighting
        this._highlightedMoves.forEach((move) => {
          if (row === move.row && col === move.col) {
            cellString = highlightPossibleMove(cellString);
          }
        });

        //handle black and white pattern
        if (
          (cellNumber % 2 === 1 && row % 2 === 1) ||
          (cellNumber % 2 === 0 && row % 2 === 0)
        ) {
          cellString = chalk.bgHex("031B26")(cellString);
        } else {
          cellString = chalk.bgHex("F7F3F5")(cellString);
        }
        if (cell instanceof Piece) {
          switch (cell.color) {
            case "black":
              cellString = chalk.hex("7D4F50")(cellString);
              break;
            case "white":
              cellString = chalk.hex("93AAB4")(cellString);
              break;
            default:
              break;
          }
        }
        rowString += cellString;
        rowString += col !== 8 ? "" : "\n";
      }
      result += 9 - row + ". " + rowString;
    }

    result += "    A  B  C  D  E  F  G  H";
    this._debugList.forEach((x) => {
      result += String(x);
    });
    return result;
  }

  deselectCells() {
    this._selectedCell = undefined;
    this._highlightedMoves.splice(0, this._highlightedMoves.length);
  }

  selectHighlightedCell() {
    const { row, col } = this._highlightedCell;
    const index1D = convert2DIndexTo1D(row, col);
    if (
      !!this._selectedCell &&
      row === this._selectedCell.row &&
      col === this._selectedCell.col
    ) {
      this.deselectCells();
      return;
    }
    if (this.moveMode && this._selectedCell) {
      // if in movemode
      if (
        this._selectedCell.row === this._highlightedCell.row &&
        this._selectedCell.col === this._highlightedCell.col
      ) {
        this.deselectCells();
        return;
      }
      const cell =
        this._board[
          convert2DIndexTo1D(this._selectedCell.row, this._selectedCell.col)
        ];
      const madeLegalMove = this.move(
        this._selectedCell,
        this._highlightedCell
      );
      if (madeLegalMove && cell !== 0) {
        cell.hasMovedOnce = true;
      }
    } else if (this._board[index1D] !== 0) {
      // if seleceted cell from move has a piece
      this._selectedCell = { row, col };
      const cell =
        this._board[
          convert2DIndexTo1D(this._selectedCell.row, this._selectedCell.col)
        ];
      if (cell !== 0) {
        this.highlightMoves(cell);
      }
    }
  }

  highlightMoves(cell: Piece) {
    this._highlightedMoves.splice(0, this._highlightedMoves.length);
    if (!this._selectedCell) {
      return;
    }

    const { row, col } = this._selectedCell;
    switch (cell.name) {
      case "pawn":
        {
          const direction = cell.color === "white" ? 1 : -1;
          let lookahead;
          lookahead = this._board[convert2DIndexTo1D(row - 2 * direction, col)];
          if (lookahead === 0) {
            if (!cell.hasMovedOnce) {
              this._highlightedMoves.push({ row: row - 2 * direction, col });
            }
          }
          lookahead = this._board[convert2DIndexTo1D(row - 1 * direction, col)];
          if (lookahead === 0) {
            this._highlightedMoves.push({ row: row - 1 * direction, col });
          }
          const { topLeft, topRight, bottomLeft, bottomRight } =
            this.calculatePaths(cell, this._selectedCell, true);
          if (direction === 1) {
            if (topLeft.length > 0) {
              const topLeftCell =
                this._board[convert2DIndexTo1D(topLeft[0].row, topLeft[0].col)];
              if (topLeftCell !== 0 && topLeftCell.color !== cell.color) {
                this._highlightedMoves.push(topLeft[0]);
              }
            }
            if (topRight.length > 0) {
              const topRightCell =
                this._board[
                  convert2DIndexTo1D(topRight[0].row, topRight[0].col)
                ];
              if (topRightCell !== 0 && topRightCell.color !== cell.color) {
                this._highlightedMoves.push(topRight[0]);
              }
            }
          } else {
            if (bottomLeft.length > 0) {
              const bottomLeftCell =
                this._board[
                  convert2DIndexTo1D(bottomLeft[0].row, bottomLeft[0].col)
                ];
              if (bottomLeftCell !== 0 && bottomLeftCell.color !== cell.color) {
                this._highlightedMoves.push(bottomLeft[0]);
              }
            }
            if (bottomRight.length > 0) {
              const bottomRightCell =
                this._board[
                  convert2DIndexTo1D(bottomRight[0].row, bottomRight[0].col)
                ];
              if (
                bottomRightCell !== 0 &&
                bottomRightCell.color !== cell.color
              ) {
                this._highlightedMoves.push(bottomRight[0]);
              }
            }
          }
        }
        break;
      case "rook":
        {
          const { top, right, bottom, left } = this.calculatePaths(
            cell,
            this._selectedCell
          );
          this._highlightedMoves = this._highlightedMoves.concat(
            top,
            right,
            bottom,
            left
          );
        }
        break;
      case "bishop":
        {
          const { topLeft, topRight, bottomLeft, bottomRight } =
            this.calculatePaths(cell, this._selectedCell);
          this._highlightedMoves = this._highlightedMoves.concat(
            topLeft,
            topRight,
            bottomLeft,
            bottomRight
          );
        }
        break;
      case "knight":
        // above
        {
          const positions: IBoardCoordinate[] = [
            { row: row - 2, col: col - 1 },
            { row: row - 2, col: col + 1 },
            { row: row - 1, col: col - 2 },
            { row: row - 1, col: col + 2 },
            { row: row + 2, col: col + 1 },
            { row: row + 2, col: col - 1 },
            { row: row + 1, col: col - 2 },
            { row: row + 1, col: col + 2 },
          ];
          positions.forEach((pos) => {
            let lookahead = this._board[convert2DIndexTo1D(pos.row, pos.col)];
            if (
              lookahead === 0 ||
              (!!lookahead && lookahead.color !== cell.color)
            ) {
              this._highlightedMoves.push(pos);
            }
          });
        }
        break;
      case "queen":
        {
          const {
            top,
            right,
            bottom,
            left,
            topRight,
            topLeft,
            bottomLeft,
            bottomRight,
          } = this.calculatePaths(cell, this._selectedCell);
          this._highlightedMoves = this._highlightedMoves.concat(
            top,
            right,
            bottom,
            left,
            topLeft,
            topRight,
            bottomLeft,
            bottomRight
          );
        }
        break;
      case "king":
        {
          const {
            top,
            right,
            bottom,
            left,
            topRight,
            topLeft,
            bottomLeft,
            bottomRight,
          } = this.calculatePaths(cell, this._selectedCell, true);
          this._highlightedMoves = this._highlightedMoves.concat(
            top,
            right,
            bottom,
            left,
            topLeft,
            topRight,
            bottomLeft,
            bottomRight
          );

          // castling
          if (!cell.hasMovedOnce) {
            // right
            let piece: (typeof this._board)[number] = 0;
            for (let i = 1; col + i <= 8; i++) {
              piece = this._board[convert2DIndexTo1D(row, col + i)];
              if (piece !== 0) {
                break;
              }
            }
            if (piece !== 0 && piece.name === "rook" && !piece.hasMovedOnce) {
              this._highlightedMoves.push({ row: row, col: col + 2 });
            }

            //left
            for (let i = 1; col - i >= 1; i++) {
              piece = this._board[convert2DIndexTo1D(row, col - i)];
              if (piece !== 0) {
                break;
              }
            }
            if (piece !== 0 && piece.name === "rook" && !piece.hasMovedOnce) {
              this._highlightedMoves.push({ row: row, col: col - 2 });
            }
          }
        }
        break;
      default:
        break;
    }
  }

  move(from: IBoardCoordinate, to: IBoardCoordinate) {
    const fromCell = convert2DIndexTo1D(from.row, from.col);
    const toCell = convert2DIndexTo1D(to.row, to.col);

    const piece = this._board[fromCell];
    const isCastling =
      piece !== 0 && piece.name === "king" && Math.abs(from.col - to.col) === 2;

    for (const highlightedMove of this._highlightedMoves) {
      if (highlightedMove.row === to.row && highlightedMove.col === to.col) {
        // check for castling
        this._board[toCell] = this._board[fromCell];
        this._board[fromCell] = 0;
        if (isCastling) {
          if (fromCell < toCell) {
            // right castle
            this._board[toCell - 1] = this._board[toCell + 1];
            this._board[toCell + 1] = 0;
          } else if (fromCell > toCell) {
            //left castle
            this._board[toCell + 1] = this._board[toCell - 2];
            this._board[toCell - 2] = 0;
          }
        }
        this.deselectCells();
        return true;
      }
    }

    this.deselectCells();
    return false;
  }

  calculatePaths(
    cell: Piece,
    selectedCell: IBoardCoordinate,
    singleStep: boolean = false
  ) {
    const { row, col } = selectedCell;
    const paths: {
      [K in
        | "top"
        | "right"
        | "bottom"
        | "left"
        | "topLeft"
        | "topRight"
        | "bottomLeft"
        | "bottomRight"]: IBoardCoordinate[];
    } = {
      top: [],
      right: [],
      bottom: [],
      left: [],
      topLeft: [],
      topRight: [],
      bottomLeft: [],
      bottomRight: [],
    };

    //top
    for (let i = row - 1; i >= 1; i--) {
      const lookahead = this._board[convert2DIndexTo1D(i, col)];
      if (lookahead !== 0) {
        if (lookahead.color !== cell.color) {
          paths.top.push({ row: i, col });
        }
        break;
      }
      paths.top.push({ row: i, col });
      if (singleStep) {
        break;
      }
    }
    // bottom
    for (let i = row + 1; i <= 8; i++) {
      const lookahead = this._board[convert2DIndexTo1D(i, col)];
      if (lookahead !== 0) {
        if (lookahead.color !== cell.color) {
          paths.bottom.push({ row: i, col });
        }
        break;
      }
      paths.bottom.push({ row: i, col });
      if (singleStep) {
        break;
      }
    }
    // left
    for (let i = col - 1; i >= 1; i--) {
      const lookahead = this._board[convert2DIndexTo1D(row, i)];
      if (lookahead !== 0) {
        if (lookahead.color !== cell.color) {
          paths.left.push({ row, col: i });
        }
        break;
      }
      paths.left.push({ row, col: i });
      if (singleStep) {
        break;
      }
    }
    // right
    for (let i = col + 1; i <= 8; i++) {
      const lookahead = this._board[convert2DIndexTo1D(row, i)];
      if (lookahead !== 0) {
        if (lookahead.color !== cell.color) {
          paths.right.push({ row, col: i });
        }
        break;
      }
      paths.right.push({ row, col: i });
      if (singleStep) {
        break;
      }
    }

    let i, j;
    // topLeft
    (i = row), (j = col);
    while (i > 1 && j > 1) {
      i--;
      j--;
      const lookahead = this._board[convert2DIndexTo1D(i, j)];
      if (lookahead !== 0) {
        if (lookahead.color !== cell.color) {
          paths.topLeft.push({ row: i, col: j });
        }
        break;
      }
      paths.topLeft.push({ row: i, col: j });
      if (singleStep) {
        break;
      }
    }

    // topRight
    (i = row), (j = col);
    while (i > 1 && j < 8) {
      i--;
      j++;
      const lookahead = this._board[convert2DIndexTo1D(i, j)];
      if (lookahead !== 0) {
        if (lookahead.color !== cell.color) {
          paths.topRight.push({ row: i, col: j });
        }
        break;
      }
      paths.topRight.push({ row: i, col: j });
      if (singleStep) {
        break;
      }
    }

    // bottomLeft
    (i = row), (j = col);
    while (i < 8 && j > 1) {
      i++;
      j--;
      const lookahead = this._board[convert2DIndexTo1D(i, j)];
      if (lookahead !== 0) {
        if (lookahead.color !== cell.color) {
          paths.bottomLeft.push({ row: i, col: j });
        }
        break;
      }
      paths.bottomLeft.push({ row: i, col: j });
      if (singleStep) {
        break;
      }
    }

    // bottomRight
    (i = row), (j = col);
    while (i < 8 && j < 8) {
      i++;
      j++;
      const lookahead = this._board[convert2DIndexTo1D(i, j)];
      if (lookahead !== 0) {
        if (lookahead.color !== cell.color) {
          paths.bottomRight.push({ row: i, col: j });
        }
        break;
      }
      paths.bottomRight.push({ row: i, col: j });
      if (singleStep) {
        break;
      }
    }

    return paths;
  }

  moveUp() {
    this._highlightedCell.row -= this._highlightedCell.row > 1 ? 1 : 0;
  }

  moveDown() {
    this._highlightedCell.row += this._highlightedCell.row < 8 ? 1 : 0;
  }

  moveLeft() {
    this._highlightedCell.col -= this._highlightedCell.col > 1 ? 1 : 0;
  }

  moveRight() {
    this._highlightedCell.col += this._highlightedCell.col < 8 ? 1 : 0;
  }
}

function convert2DIndexTo1D(row: number, col: number) {
  return (row - 1) * 8 + col - 1;
}

function cellStringWrap(cellString: string) {
  return " " + cellString + " ";
}

function highlightCellString(cellString: string) {
  return chalk.bold(chalk.bgRed(cellString));
}

function highlightPossibleMove(cellString: string) {
  return chalk.bgBlue(cellString);
}

function selectCellString(cellString: string) {
  return chalk.bold(chalk.bgGreen(cellString));
}

const newBoard = new Board();
newBoard.arrangeBoard();
console.log(newBoard.drawBoard());
console.log(newBoard.highlightedCell);

// Handle user key input on key down
process.stdin.on("keypress", (_, key) => {
  if (key && key.ctrl && key.name === "c") {
    // Exit on Ctrl+C
    process.exit();
  } else {
    switch (key.name) {
      case "right":
        newBoard.moveRight();
        break;
      case "left":
        newBoard.moveLeft();
        break;
      case "up":
        newBoard.moveUp();
        break;
      case "down":
        newBoard.moveDown();
        break;
      case "return":
        newBoard.selectHighlightedCell();
        break;
      default:
        console.log(key);
        break;
    }
    console.log(newBoard.drawBoard());
    console.log(newBoard.highlightedCell);
    console.log("selected:", newBoard.selectedCell);
  }
});

// todo: add pawn ranking up move:
// todo: add "game" mode e.g with board rotation.
