import readline from "readline";
import chalk from "chalk";

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

type IName = "king" | "queen" | "knight" | "bishop" | "rook" | "pawn";
type IColor = "white" | "black";
type INotation =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";
type IBoardCoordinate = { row: number; col: number }; //1-indexed
class Piece {
  private _score: number;
  private _name: IName;
  private _color: IColor;
  private _notation: INotation;
  private _canJump: boolean = false;
  private _hasMovedOnce: boolean = false;

  constructor(name: IName, color: IColor) {
    this._name = name;
    this._color = color;

    switch (name) {
      case "king":
        this._score = Infinity;
        this._notation = this._getNotation(name, "A", "U");
        break;
      case "queen":
        this._score = 10;
        this._notation = this._getNotation(name, "B", "V");
        break;
      case "rook":
        this._score = 5;
        this._notation = this._getNotation(name, "C", "W");
        break;
      case "knight":
        this._score = 3;
        this._notation = this._getNotation(name, "D", "X");
        this._canJump = true;
        break;
      case "bishop":
        this._score = 3;
        this._notation = this._getNotation(name, "E", "Y");
        break;
      case "pawn":
        this._score = 1;
        this._notation = this._getNotation(name, "F", "Z");
        break;
      default:
        throw Error("Invalid Chess Piece Name");
    }
  }

  private _getNotation(name: IName, wName: INotation, bName: INotation) {
    switch (this._color) {
      case "white":
        return wName;
      case "black":
        return bName;
      default:
        throw Error("Invalid Piece Color");
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

  get hasMovedOnce() {
    return this._hasMovedOnce;
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
        let cellString = cell instanceof Piece ? cell.notation : `${cell}`;
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
          cellString = chalk.bgWhite(chalk.black(cellString));
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
    if (this._board[index1D] !== 0) {
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
          if (!cell.hasMovedOnce) {
            this._highlightedMoves.push({ row: row - 2 * direction, col });
          }
          this._highlightedMoves.push({ row: row - 1 * direction, col });
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
        this._highlightedMoves.push({ row: row - 2, col: col - 1 });
        this._highlightedMoves.push({ row: row - 2, col: col + 1 });
        this._highlightedMoves.push({ row: row - 1, col: col - 2 });
        this._highlightedMoves.push({ row: row - 1, col: col + 2 });
        //below
        this._highlightedMoves.push({ row: row + 2, col: col + 1 });
        this._highlightedMoves.push({ row: row + 2, col: col - 1 });
        this._highlightedMoves.push({ row: row + 1, col: col - 2 });
        this._highlightedMoves.push({ row: row + 1, col: col + 2 });
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
        }
        break;
      default:
        break;
    }
  }

  calculatePaths<T>(
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
  return chalk.bold(chalk.bgRed(chalk.white(cellString)));
}

function highlightPossibleMove(cellString: string) {
  return chalk.bgBlue(chalk.green(cellString));
}

function selectCellString(cellString: string) {
  return chalk.bold(chalk.white(chalk.bgGreen(cellString)));
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
    const selected = newBoard.selectedCell;
  }
});
