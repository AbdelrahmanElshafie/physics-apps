# Nuclear Physics & Quantum Mechanics Handbook
## Personal Study Reference

**Created:** February 17, 2026
**Last Updated:** February 17, 2026
**Purpose:** Complete reference of all concepts, examples, and exercises from our learning sessions

---

# TABLE OF CONTENTS

1. [Module 1.1: Vector Spaces Basics](#module-11-vector-spaces-basics)
2. [Module 1.1: Hilbert Spaces](#module-11-hilbert-spaces) *(upcoming)*
3. [Module 1.1: Dirac Notation](#module-11-dirac-notation) *(upcoming)*

---

# MODULE 1.1: VECTOR SPACES BASICS

**Status:** COMPLETE
**Date Learned:** February 17, 2026

---

## 1. What is a Vector?

### Definition
A **vector** is a mathematical object that represents a direction and magnitude. Think of it as an instruction: "go this much in these directions."

### Physical Intuition
Imagine you're standing somewhere. The instruction "walk 3 steps right, then 2 steps forward" is a vector: **(3, 2)**

### Notation
A vector can be written as:
- Ordered numbers in parentheses: (3, 2)
- Bold letter: **v**
- Arrow above: v⃗

---

## 2. What is an Arrow?

### Definition
An **arrow** is a visual/geometric picture of a vector.

### Components of an Arrow

| Part | Meaning |
|------|---------|
| **Tail** | Where the arrow starts (usually at origin 0,0) |
| **Head** | Where the arrow ends (the pointy tip) |
| **Length** | How long the arrow is (magnitude) |
| **Direction** | Where the arrow points |

### Visual Example
```
Vector (3, 2) as an arrow:

    y
    ↑
  3 |
    |         ← HEAD (end point at x=3, y=2)
  2 |        /
    |      /
  1 |    /
    |  /
  0 |/____________→ x
    0  1  2  3
    ↑
   TAIL (start at origin)
```

### Direction Rules

| Component | Positive | Negative |
|-----------|----------|----------|
| **x** (first number) | RIGHT → | LEFT ← |
| **y** (second number) | UP ↑ | DOWN ↓ |

### Examples of Directions
```
(3, 0)   →  RIGHT
(-3, 0)  →  LEFT
(0, 2)   →  UP
(0, -2)  →  DOWN
(3, 2)   →  RIGHT + UP (diagonal)
(-3, -2) →  LEFT + DOWN (diagonal)
(4, 4)   →  45° diagonal up-right
(-1, -1) →  45° diagonal down-left
```

---

## 3. What is a Vector Space?

### Definition
A **vector space** is a collection of ALL possible vectors of a certain type.

### Physical Intuition
If you can only move on a flat floor (left/right and forward/back), then ALL possible movements you could make form a vector space.

### The Rules (Axioms)
For a set V to be a vector space, these must hold for all vectors **u**, **v**, **w** and scalars a, b:

| Rule | Meaning |
|------|---------|
| **u** + **v** = **v** + **u** | Commutative |
| (**u** + **v**) + **w** = **u** + (**v** + **w**) | Associative |
| There exists **0** such that **v** + **0** = **v** | Zero vector exists |
| For every **v**, exists **−v** such that **v** + (−**v**) = **0** | Negatives exist |
| a(**u** + **v**) = a**u** + a**v** | Scalar distributes over vector addition |
| (a + b)**v** = a**v** + b**v** | Scalars distribute |
| a(b**v**) = (ab)**v** | Scalar multiplication associates |
| 1**v** = **v** | Multiplying by 1 does nothing |

---

## 4. Naming Convention: R² and C²

### The Pattern

| Symbol | Meaning |
|--------|---------|
| **R** | Real numbers (normal numbers: 1, 2.5, -3, π) |
| **C** | Complex numbers (numbers like 3 + 2i) |
| **Superscript n** | How many numbers needed to describe each vector |

### Common Vector Spaces

| Name | What's inside | How many numbers | Geometric meaning |
|------|---------------|------------------|-------------------|
| R¹ | Real numbers | 1 | A line |
| R² | Real numbers | 2 | A flat plane |
| R³ | Real numbers | 3 | 3D space |
| Rⁿ | Real numbers | n | n-dimensional space |
| C¹ | Complex numbers | 1 | Complex plane |
| C² | Complex numbers | 2 | Used for electron spin |
| Cⁿ | Complex numbers | n | n-dimensional complex space |

### Examples

**R² vectors:**
```
(3, 2)
(0, 0)
(-1.5, 7)
(π, -√2)
```

**R³ vectors:**
```
(3, 2, 1)   → 3 right, 2 forward, 1 up
(0, 0, 5)   → just 5 up
```

**C² vectors (quantum mechanics uses these):**
```
( 1 + i  )
( 2 - 3i )
```

**C³ vectors:**
```
( 3 + 2i )
( 1 - i  )
( 0 + 4i )
```

---

## 5. Row vs Column Notation

### Two Ways to Write the Same Vector

**Row (horizontal):**
```
(3, 2, 1)
```

**Column (vertical):**
```
( 3 )
( 2 )
( 1 )
```

**These mean the exact same vector.**

### When to Use Each

| Notation | When we use it |
|----------|----------------|
| Row: (3, 2, 1) | Quick writing, simple discussions |
| Column: stacked vertically | Matrix multiplication, quantum mechanics |

### Why Quantum Mechanics Prefers Columns
Matrix multiplication requires column vectors:
```
[ a  b ] ( x )   =   ( ax + by )
[ c  d ] ( y )       ( cx + dy )

  Matrix  × Column   =   Column
  (2×2)     vector       vector
```

---

## 6. Operations on Vectors

### Vector Addition
Add component by component:
```
(3, 2) + (1, 4) = (3+1, 2+4) = (4, 6)
```

**Geometric meaning:** Place arrows tip-to-tail, result goes from start to final end.

### Scalar Multiplication
Multiply each component by the scalar:
```
3 × (2, -1) = (6, -3)
```

**Geometric meaning:**
- Scalar > 1: Arrow stretches (gets longer)
- Scalar < 1: Arrow shrinks (gets shorter)
- Scalar < 0: Arrow reverses direction

### Example: Effect on Arrows
```
Original v = (3, 1)     →  Arrow of length √10 ≈ 3.16
After 2v = (6, 2)       →  Arrow of length √40 ≈ 6.32 (doubled)
After -1v = (-3, -1)    →  Same length, opposite direction
```

---

## 7. Linear Combination

### Definition
A **linear combination** is when you multiply vectors by scalars and add them:
```
c₁v₁ + c₂v₂ + c₃v₃ + ...
```

### Example
```
3(2, -1) + 2(1, 4)
= (6, -3) + (2, 8)
= (8, 5)
```

### Why It Matters
In quantum mechanics, we write states as linear combinations of basis states.

---

## 8. Span

### Definition
The **span** of a set of vectors is all points you can reach using linear combinations of those vectors.

### Example
Span of **e₁** = (1, 0) and **e₂** = (0, 1):
- Can reach (7, 3) via 7**e₁** + 3**e₂**
- Can reach (-2, 5) via -2**e₁** + 5**e₂**
- Can reach ANY point in R²

So: span{**e₁**, **e₂**} = all of R²

---

## 9. Basis

### Definition
A **basis** is a set of vectors that:
1. Are linearly independent (none is a multiple of another)
2. Span the entire space (can reach any point)

### Standard Basis for R²
```
e₁ = (1, 0)
e₂ = (0, 1)
```

### Standard Basis for R³
```
e₁ = (1, 0, 0)
e₂ = (0, 1, 0)
e₃ = (0, 0, 1)
```

### How Many Vectors in a Basis?

| Space | Dimension | Vectors needed for basis |
|-------|-----------|-------------------------|
| R¹ | 1 | 1 vector |
| R² | 2 | 2 vectors |
| R³ | 3 | 3 vectors |
| Rⁿ | n | n vectors |

---

## 10. Linear Independence and Dependence

### Linearly Dependent
One vector IS a multiple of another. They point in the same (or opposite) direction.

**Example:**
```
u = (1, 2)
v = (2, 4) = 2u

v is just 2 times u → DEPENDENT
```

**Problem:** Dependent vectors can only reach a LINE, not the whole plane.

### Linearly Independent
No vector is a multiple of another. They point in different directions.

**Example:**
```
u = (1, 0)
v = (0, 1)

Cannot write v = k × u for any k → INDEPENDENT
```

**Benefit:** Independent vectors can form a basis.

### How to Check
Ask: Is **v** = k × **u** for some number k?

```
Check if (2, 6) and (1, 3) are dependent:

(2, 6) = k × (1, 3)?
(2, 6) = (k, 3k)

2 = k  →  k = 2
6 = 3k →  k = 2 ✓

YES, (2, 6) = 2 × (1, 3) → DEPENDENT
```

---

## 11. Subspaces

### Definition
A **subspace** is a vector space that lives inside a bigger vector space.

### Requirements for a Subspace
1. Contains the zero vector
2. Closed under addition (add two vectors, stay in subspace)
3. Closed under scalar multiplication (multiply by scalar, stay in subspace)

### Subspaces of R²

| Type | Dimension | How Many? | Example |
|------|-----------|-----------|---------|
| Origin only | 0 | 1 | {(0,0)} |
| Line through origin | 1 | ∞ (infinitely many) | x-axis, y-axis, y=2x, ... |
| Whole plane R² | 2 | 1 | R² itself |

### Subspaces of R³

| Type | Dimension | How Many? |
|------|-----------|-----------|
| Origin only | 0 | 1 |
| Line through origin | 1 | ∞ |
| Plane through origin | 2 | ∞ |
| Whole space R³ | 3 | 1 |

### Important Note
A subspace MUST pass through the origin (contain the zero vector).

```
This line IS a subspace:          This line is NOT a subspace:
    y                                 y
    |  /                              |    /
    | /                               |   /
----●---- x                       ----|--/-- x
   /|                                 | /
(passes through origin)           (doesn't pass through origin)
```

---

## 12. Matrices (Introduction)

### Definition
A **matrix** is a box of numbers arranged in rows and columns.

```
Example - a 2×2 matrix:

[ 3  1 ]
[ 2  4 ]
```

### What Matrices Do
A matrix **transforms** a vector into a different vector.

### Matrix × Vector Multiplication

```
[ 2  1 ]   ( 3 )
[ 0  3 ] × ( 1 )

Step 1 - Row 1 × vector:
[2  1] × (3, 1) = 2×3 + 1×1 = 7

Step 2 - Row 2 × vector:
[0  3] × (3, 1) = 0×3 + 3×1 = 3

Result:
[ 2  1 ] ( 3 )   ( 7 )
[ 0  3 ] ( 1 ) = ( 3 )
```

### Examples of Transformations

**Stretching (doubles everything):**
```
[ 2  0 ]   ( 3 )   ( 6 )
[ 0  2 ] × ( 1 ) = ( 2 )
```

**Rotation by 90°:**
```
[ 0  -1 ]   ( 1 )   ( 0 )
[ 1   0 ] × ( 0 ) = ( 1 )
```

---

## 13. Dimension

### Definition
The **dimension** of a vector space is the number of vectors needed in a basis.

### Examples
- R² has dimension 2
- R³ has dimension 3
- A line through origin in R² has dimension 1
- The origin alone has dimension 0

---

# EXERCISES: MODULE 1.1

## Exercise Set A: Basic Understanding

**Q1.** Write what each vector means as a movement instruction:
- (a) (0, 4)
- (b) (-2, -2)
- (c) (7, 0)

**Q2.** What is the name of the vector space where each vector has 5 real numbers?

**Q3.** A vector in C³ has how many complex numbers? Give an example.

---

## Exercise Set B: Operations

**Q4.** Calculate 2 × (3, 1). What happens to the arrow?

**Q5.** Calculate (2, 3) + (1, -1).

**Q6.** Calculate 3(2, -1) + 2(1, 4).

---

## Exercise Set C: True/False

**Q7.** True or False (explain why):
- (a) The vector (3, 2, 1) belongs to R²
- (b) The vector (0, 0) belongs to R²
- (c) The vector (1, 2) belongs to R³

**Q8.** Can a vector space be empty (contain nothing)?

---

## Exercise Set D: Deeper Thinking

**Q9.** I take ANY two vectors from R² and add them. Will the result ALWAYS be in R²?

**Q10.** What is the zero vector in R²? In R³? Why must every vector space have a zero vector?

**Q11.** "The set of all vectors (x, 0) where x is any real number forms a vector space." True or false? What does it look like geometrically?

---

## Exercise Set E: Independence and Basis

**Q12.** Are (1, 0) and (0, 1) linearly independent or dependent?

**Q13.** Are (2, 6) and (1, 3) linearly independent or dependent?

**Q14.** Can you reach ANY point in R² using only **e₁** = (1, 0) and **e₂** = (0, 1)? Show how to reach (7, 3).

**Q15.** Why can't you reach every point in R² using only **a** = (1, 2) and **b** = (2, 4)?

**Q16.** To form a basis for R³, how many linearly independent vectors do you need?

---

## Exercise Set F: Matrix Multiplication

**Q17.** Multiply:
```
[ 1  2 ]   ( 4 )
[ 3  0 ] × ( 1 ) = ?
```

---

## Exercise Set G: Directions

**Q18.** What direction does each arrow point?
- (a) (0, -5)
- (b) (-2, 0)
- (c) (4, 4)
- (d) (-1, -1)

**Q19.** The vector (-3, 0): which direction does it point, and what is its length?

**Q20.** I multiply vector (1, 1) by -1. What happens to its arrow?

---

# SOLUTIONS: MODULE 1.1

## Solutions Set A

**Q1.**
- (a) (0, 4) → Move 4 steps forward (up)
- (b) (-2, -2) → Move 2 steps left and 2 steps backward (down)
- (c) (7, 0) → Move 7 steps right

**Q2.** R⁵ (R to the power of 5)

**Q3.** Three complex numbers. Example:
```
( 3 + 2i )
( 1 - i  )
( 0 + 4i )
```

---

## Solutions Set B

**Q4.**
```
2 × (3, 1) = (6, 2)
```
The arrow doubles in length but points in the same direction.

**Q5.**
```
(2, 3) + (1, -1) = (2+1, 3+(-1)) = (3, 2)
```

**Q6.**
```
3(2, -1) + 2(1, 4)
= (6, -3) + (2, 8)
= (8, 5)
```

---

## Solutions Set C

**Q7.**
- (a) FALSE — (3, 2, 1) has three numbers, R² needs exactly two
- (b) TRUE — (0, 0) has two real numbers
- (c) FALSE — (1, 2) has two numbers, R³ needs exactly three

**Q8.** NO. Every vector space must contain at least the zero vector. The zero vector is the "neutral element" for addition (adding zero changes nothing).

---

## Solutions Set D

**Q9.** YES. Adding two pairs of numbers gives another pair of numbers, which is still in R². This property is called "closure under addition."

**Q10.**
- Zero vector in R²: (0, 0)
- Zero vector in R³: (0, 0, 0)
- Every vector space needs it because: **v** + **0** = **v** (it's the neutral/identity element for addition)

**Q11.** TRUE — it is a vector space (1-dimensional subspace of R²).

Check:
- Contains zero: (0, 0) ✓
- Closed under addition: (3, 0) + (5, 0) = (8, 0) ✓
- Closed under scalar multiplication: 7 × (3, 0) = (21, 0) ✓

Geometrically: It's the **x-axis** (horizontal line through origin).

---

## Solutions Set E

**Q12.** INDEPENDENT
- (1, 0) points RIGHT
- (0, 1) points UP
- Different directions, neither is a multiple of the other

**Q13.** DEPENDENT
- (2, 6) = 2 × (1, 3)
- One is a multiple of the other
- They point in the same direction

**Q14.** YES.
```
(7, 3) = 7(1, 0) + 3(0, 1) = 7e₁ + 3e₂
```

**Q15.** Because **b** = 2**a**, they are linearly dependent. Any combination c₁**a** + c₂**b** = (c₁ + 2c₂)**a** always points in the direction of **a**. You can only reach points on the line through origin in direction (1, 2), not the whole plane.

**Q16.** 3 vectors (dimension of R³ = 3)

---

## Solutions Set F

**Q17.**
```
[ 1  2 ]   ( 4 )   ( 1×4 + 2×1 )   ( 6  )
[ 3  0 ] × ( 1 ) = ( 3×4 + 0×1 ) = ( 12 )
```

---

## Solutions Set G

**Q18.**
- (a) (0, -5) → DOWN (y is negative, x is zero)
- (b) (-2, 0) → LEFT (x is negative, y is zero)
- (c) (4, 4) → 45° diagonal UP-RIGHT
- (d) (-1, -1) → 45° diagonal DOWN-LEFT

**Q19.** (-3, 0) points LEFT (horizontal), length = 3

**Q20.** -1 × (1, 1) = (-1, -1). The arrow reverses direction (points opposite way, same length).

---

# KEY FORMULAS SUMMARY

## Vector Operations
```
Addition:           (a, b) + (c, d) = (a+c, b+d)
Scalar multiply:    k(a, b) = (ka, kb)
Linear combination: c₁v₁ + c₂v₂ + ... + cₙvₙ
```

## Vector Length (Magnitude)
```
|(a, b)| = √(a² + b²)
|(a, b, c)| = √(a² + b² + c²)
```

## Matrix × Vector
```
[ a  b ] ( x )   ( ax + by )
[ c  d ] ( y ) = ( cx + dy )
```

## Independence Test
```
Vectors u and v are DEPENDENT if v = ku for some scalar k
Vectors u and v are INDEPENDENT if no such k exists
```

---

*This handbook will be updated as we progress through the learning path.*
