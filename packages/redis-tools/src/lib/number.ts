export function double(value: number): number {
  return value * 2
}

export function power(base: number, exponent: number): number {
  // This is a proposed es7 operator, which should be transpiled by Typescript
  return base ** exponent
}

export function subtract(lhs: number, rhs: number): number {
  return lhs - rhs
}
