/** Textbook union-find with path compression and union by size. */
export class UnionFind<T> {
  private readonly parent = new Map<T, T>()
  private readonly size = new Map<T, number>()

  private ensure(x: T): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x)
      this.size.set(x, 1)
    }
  }

  find(x: T): T {
    this.ensure(x)
    let root = x
    while (this.parent.get(root) !== root) root = this.parent.get(root)!
    // Path compression.
    let cur = x
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!
      this.parent.set(cur, root)
      cur = next
    }
    return root
  }

  union(a: T, b: T): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra === rb) return
    const sa = this.size.get(ra)!
    const sb = this.size.get(rb)!
    if (sa < sb) {
      this.parent.set(ra, rb)
      this.size.set(rb, sa + sb)
    } else {
      this.parent.set(rb, ra)
      this.size.set(ra, sa + sb)
    }
  }

  /** Every element ever passed to `find` or `union`. */
  members(): T[] {
    return [...this.parent.keys()]
  }
}
