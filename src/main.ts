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
  private _highlightedCell: { row: number; col: number } = { row: 7, col: 5 };
  private _selectedCell: { row: number; col: number } | undefined;
  private _highlightedMoves: { row: number; col: number }[] = [];
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
        for (let i = row - 1; i >= 1; i--) {
          const lookahead = this._board[convert2DIndexTo1D(i, col)];
          if (lookahead !== 0) {
            if (lookahead.color !== cell.color) {
              this._highlightedMoves.push({ row: i, col });
            }
            break;
          }
          this._highlightedMoves.push({ row: i, col });
        }
        for (let i = row + 1; i <= 8; i++) {
          const lookahead = this._board[convert2DIndexTo1D(i, col)];
          if (lookahead !== 0) {
            if (lookahead.color !== cell.color) {
              this._highlightedMoves.push({ row: i, col });
            }
            break;
          }
          this._highlightedMoves.push({ row: i, col });
        }
        for (let i = col - 1; i >= 1; i--) {
          const lookahead = this._board[convert2DIndexTo1D(row, i)];
          if (lookahead !== 0) {
            if (lookahead.color !== cell.color) {
              this._highlightedMoves.push({ row, col: i });
            }
            break;
          }
          this._highlightedMoves.push({ row, col: i });
        }
        for (let i = col + 1; i <= 8; i++) {
          const lookahead = this._board[convert2DIndexTo1D(row, i)];
          if (lookahead !== 0) {
            if (lookahead.color !== cell.color) {
              this._highlightedMoves.push({ row, col: i });
            }
            break;
          }
          this._highlightedMoves.push({ row, col: i });
        }
        break;
      case "bishop":
        for (let i = 1; i <= 8; i++) {
          if (row - i >= 1 && col - i >= 1) {
            this._highlightedMoves.push({ row: row - i, col: col - i });
          }
          if (row - i >= 1 && col + i <= 8) {
            this._highlightedMoves.push({ row: row - i, col: col + i });
          }
          if (row + i <= 8 && col - i >= 1) {
            this._highlightedMoves.push({ row: row + i, col: col - i });
          }
          if (row + i <= 8 && col + i <= 8) {
            this._highlightedMoves.push({ row: row + i, col: col + i });
          }
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
        for (let i = 1; i <= 8; i++) {
          this._highlightedMoves.push({ row: i, col });
          this._highlightedMoves.push({ row, col: i });
          if (row - i >= 1 && col - i >= 1) {
            this._highlightedMoves.push({ row: row - i, col: col - i });
          }
          if (row - i >= 1 && col + i <= 8) {
            this._highlightedMoves.push({ row: row - i, col: col + i });
          }
          if (row + i <= 8 && col - i >= 1) {
            this._highlightedMoves.push({ row: row + i, col: col - i });
          }
          if (row + i <= 8 && col + i <= 8) {
            this._highlightedMoves.push({ row: row + i, col: col + i });
          }
        }
        break;
      case "king":
        {
          this._highlightedMoves.push({ row: row - 1, col });
          this._highlightedMoves.push({ row: row + 1, col });
          this._highlightedMoves.push({ row, col: col - 1 });
          this._highlightedMoves.push({ row, col: col + 1 });
          this._highlightedMoves.push({ row: row - 1, col: col - 1 });
          this._highlightedMoves.push({ row: row - 1, col: col + 1 });
          this._highlightedMoves.push({ row: row + 1, col: col - 1 });
          this._highlightedMoves.push({ row: row + 1, col: col + 1 });
        }
        break;
      default:
        break;
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
    // if (selected) {
    //   console.log(
    //     "Selected Cell: ",
    //     newBoard.rawBoard[convertIndex21(selected.row, selected.col)]
    //   );
    // }
  }
});
