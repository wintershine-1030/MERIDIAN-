export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface Span {
  readonly start: number;
  readonly end: number;
}

export function makeSpan(start: number, end: number): Span {
  if (end < start) {
    throw new RangeError(`invalid span: end ${end} is before start ${start}`);
  }
  return { start, end };
}

export function spanLength(span: Span): number {
  return span.end - span.start;
}

export function spansOverlap(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

export class LineIndex {
  private readonly lineStarts: readonly number[];
  private readonly sourceLength: number;

  constructor(source: string) {
    const starts: number[] = [0];
    for (let i = 0; i < source.length; i++) {
      if (source[i] === "\n") {
        starts.push(i + 1);
      }
    }
    this.lineStarts = starts;
    this.sourceLength = source.length;
  }

  positionAt(offset: number): Position {
    if (offset < 0 || offset > this.sourceLength) {
      throw new RangeError(`offset ${offset} is out of range for a source of length ${this.sourceLength}`);
    }
    let line = 0;
    while (line + 1 < this.lineStarts.length) {
      const nextStart = this.lineStarts[line + 1];
      if (nextStart === undefined || nextStart > offset) {
        break;
      }
      line++;
    }
    const lineStart = this.lineStarts[line]!;
    return { line: line + 1, column: offset - lineStart + 1 };
  }
}
