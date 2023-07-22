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

class Piece {
  private _score: number;
  private _name: IName;
  private _color: IColor;
  private _notation: INotation;
  private _canJump: boolean = false;

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
}

type Vector = {
  x: 1 | 0 | -1 | 2 | -2 | 3 | -3;
  y: 1 | 0 | -1 | 2 | -2 | 3 | -3;
};

class Board {
  private _board = new Array<0 | Piece>(8 * 8).fill(0);
  private _highlightedCell: { row: number; col: number } = { row: 7, col: 5 };
  private _selectedCell: { row: number; col: number } | undefined;
  private _highlightedMoves: { row: number; col: number }[] = [];
  private _debugList: any[] = [];

  constructor() {
    this.arrangeBoard();
  }

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
      this._board[convertIndex21(1, col)] = piece;
    }

    //black pawns
    for (let col = 1; col <= 8; col++) {
      const piece = new Piece("pawn", "black");
      this._board[convertIndex21(2, col)] = piece;
    }

    //white pawns
    for (let col = 1; col <= 8; col++) {
      const piece = new Piece("pawn", "white");
      this._board[convertIndex21(7, col)] = piece;
    }

    //white mercernaries
    for (let col = 1; col <= 8; col++) {
      const piece = new Piece(arrangement[col - 1], "white");
      this._board[convertIndex21(8, col)] = piece;
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
  }

  selectHighlightedCell() {
    const { row, col } = this._highlightedCell;
    const index1D = convertIndex21(row, col);
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
          convertIndex21(this._selectedCell.row, this._selectedCell.col)
        ];
      if (cell !== 0) {
        this.highlightMoves(cell);
        // this._debugList.push(cell.moves.map((x) => x.name + x.vectors));
      }
    }
  }

  highlightMoves(cell: Piece) {
    this._highlightedMoves.splice(0, this._highlightedMoves.length);
    if (!this._selectedCell) {
      return;
    }
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

function convertIndex21(row: number, col: number) {
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
  return chalk.bold(chalk.magenta(chalk.bgYellow(cellString)));
}

function invertVector(v: Vector) {
  return { x: -v.x, y: -v.y } as Vector;
}

function addVectorToPoint(point: { row: number; col: number }, vector: Vector) {
  return { col: point.col + vector.x, row: point.row + vector.y };
}

function multiplyVector(vector: Vector, factor: number) {
  return { x: factor * vector.x, y: factor * vector.y } as Vector;
}

function subtractVectorFromPoint(
  point: { row: number; col: number },
  vector: Vector
) {
  return { col: point.col - vector.x, row: point.row - vector.y };
}

const newBoard = new Board();
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
    // if (selected) {
    //   console.log(
    //     "Selected Cell: ",
    //     newBoard.rawBoard[convertIndex21(selected.row, selected.col)]
    //   );
    // }
  }
});
