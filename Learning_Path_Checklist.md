# Nuclear Physics Learning Path - Interactive Sessions
## Student Progress Tracker

**Started:** February 2026
**Goal:** Master nuclear reaction theory and TALYS calculations
**Method:** Step-by-step lessons with examples, homework, and feedback

---

# HOW WE WILL WORK

For each topic:
1. **LESSON** - I explain the concept with simple examples
2. **WORKED EXAMPLE** - We solve a problem together step-by-step
3. **HOMEWORK** - You solve a similar problem independently
4. **REVIEW** - I check your work, give feedback, clarify mistakes
5. **CHECKPOINT** - Mark topic complete, move to next

---

# PHASE 1: MATHEMATICAL FOUNDATIONS

## Module 1: Quantum Mechanics Mathematics

### 1.1 Linear Algebra for Quantum Mechanics

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [x] | Vector spaces basics | Done | Completed | Arrows, R², subspaces, basis, independence |
| [ ] | Hilbert spaces | Pending | | |
| [ ] | Dirac notation (bra-ket) | Pending | | |
| [ ] | Inner products ⟨φ|ψ⟩ | Pending | | |
| [ ] | Linear operators | Pending | | |
| [ ] | Matrix representation | Pending | | |
| [ ] | Eigenvalue problems | Pending | | |
| [ ] | Hermitian operators | Pending | | |
| [ ] | Commutators [A,B] | Pending | | |
| [ ] | Unitary transformations | Pending | | |
| [ ] | **CHECKPOINT 1.1** | | HW submitted | |

**Key equations to master:**
```
Eigenvalue equation:     Ĥ|ψₙ⟩ = Eₙ|ψₙ⟩
Completeness:            Σₙ |ψₙ⟩⟨ψₙ| = 1
Orthonormality:          ⟨ψₘ|ψₙ⟩ = δₘₙ
Expectation value:       ⟨A⟩ = ⟨ψ|Â|ψ⟩
```

---

### 1.2 Differential Equations

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | ODEs review | Pending | | |
| [ ] | 2nd order linear ODEs | Pending | | |
| [ ] | Series solutions (Frobenius) | Pending | | |
| [ ] | Sturm-Liouville theory | Pending | | |
| [ ] | Legendre polynomials | Pending | | |
| [ ] | Spherical harmonics | Pending | | |
| [ ] | Bessel functions | Pending | | |
| [ ] | Spherical Bessel functions | Pending | | |
| [ ] | Radial Schrödinger equation | Pending | | |
| [ ] | **CHECKPOINT 1.2** | | HW submitted | |

**Key equations:**
```
Legendre equation:    (1-x²)y'' - 2xy' + l(l+1)y = 0
Bessel equation:      x²y'' + xy' + (x² - n²)y = 0
Radial Schrödinger:   [d²/dr² + k² - l(l+1)/r² - 2mU(r)/ℏ²]uₗ(r) = 0
```

---

### 1.3 Complex Analysis

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Complex numbers review | Pending | | |
| [ ] | Complex functions | Pending | | |
| [ ] | Analyticity | Pending | | |
| [ ] | Cauchy's theorem | Pending | | |
| [ ] | Residue calculus | Pending | | |
| [ ] | Contour integration | Pending | | |
| [ ] | Poles and branch cuts | Pending | | |
| [ ] | Application: resonances E = E₀ - iΓ/2 | Pending | | |
| [ ] | **CHECKPOINT 1.3** | | HW submitted | |

---

### 1.4 Numerical Methods

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Root finding (Newton-Raphson) | Pending | | |
| [ ] | Numerical integration (Simpson) | Pending | | |
| [ ] | Gaussian quadrature | Pending | | |
| [ ] | Runge-Kutta ODE solvers | Pending | | |
| [ ] | Interpolation methods | Pending | | |
| [ ] | Least-squares fitting | Pending | | |
| [ ] | Chi-squared minimization | Pending | | |
| [ ] | Monte Carlo basics | Pending | | |
| [ ] | **IMPLEMENTATION:** Solve Schrödinger with RK4 | Pending | | |
| [ ] | **CHECKPOINT 1.4** | | Code submitted | |

---

## Module 2: Angular Momentum Theory

### 2.1 Orbital Angular Momentum

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Angular momentum operators L̂ₓ, L̂ᵧ, L̂ᵤ | Pending | | |
| [ ] | Commutation relations | Pending | | |
| [ ] | Eigenvalues L̂²|l,m⟩ = ℏ²l(l+1)|l,m⟩ | Pending | | |
| [ ] | Spherical harmonics Yₗₘ(θ,φ) | Pending | | |
| [ ] | Ladder operators L̂± | Pending | | |
| [ ] | **CHECKPOINT 2.1** | | HW submitted | |

---

### 2.2 Spin Angular Momentum

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Spin-1/2 particles | Pending | | |
| [ ] | Pauli matrices | Pending | | |
| [ ] | Spinors |↑⟩, |↓⟩ | Pending | | |
| [ ] | Spin-orbit coupling V_so = f(r)L̂·Ŝ | Pending | | |
| [ ] | **CHECKPOINT 2.2** | | HW submitted | |

---

### 2.3 Addition of Angular Momenta (CRITICAL)

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Coupling J⃗ = L⃗ + S⃗ | Pending | | |
| [ ] | Clebsch-Gordan coefficients | Pending | | |
| [ ] | Triangle rule | Pending | | |
| [ ] | Wigner 3j symbols | Pending | | |
| [ ] | Wigner 6j symbols | Pending | | |
| [ ] | Wigner 9j symbols | Pending | | |
| [ ] | Racah algebra | Pending | | |
| [ ] | **APPLICATION:** Partial wave sums in TALYS | Pending | | |
| [ ] | **CHECKPOINT 2.3** | | HW submitted | |

---

## Module 3: Scattering Theory

### 3.1 Basic Scattering Concepts

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Cross-section definition dσ/dΩ | Pending | | |
| [ ] | Differential vs total cross-section | Pending | | |
| [ ] | Lab vs center-of-mass frames | Pending | | |
| [ ] | Elastic vs inelastic scattering | Pending | | |
| [ ] | **CHECKPOINT 3.1** | | HW submitted | |

---

### 3.2 Partial Wave Analysis

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Plane wave expansion | Pending | | |
| [ ] | Partial wave expansion of f(θ) | Pending | | |
| [ ] | Phase shifts δₗ | Pending | | |
| [ ] | S-matrix: Sₗ = e²ⁱᵟˡ | Pending | | |
| [ ] | Optical theorem | Pending | | |
| [ ] | **CHECKPOINT 3.2** | | HW submitted | |

---

### 3.3 Resonance Scattering

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Breit-Wigner formula | Pending | | |
| [ ] | Resonance energy E₀ | Pending | | |
| [ ] | Widths Γₙ, Γᵧ, Γ_total | Pending | | |
| [ ] | Physical meaning: Γ = ℏ/τ | Pending | | |
| [ ] | Statistical factor gⱼ | Pending | | |
| [ ] | R-matrix theory (intro) | Pending | | |
| [ ] | **CHECKPOINT 3.3** | | HW submitted | |

---

### 3.4 The Optical Model

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Complex potential U = V + iW | Pending | | |
| [ ] | Woods-Saxon form factor | Pending | | |
| [ ] | Volume absorption | Pending | | |
| [ ] | Surface absorption | Pending | | |
| [ ] | Spin-orbit potential | Pending | | |
| [ ] | Isospin dependence | Pending | | |
| [ ] | Koning-Delaroche parameterization | Pending | | |
| [ ] | **IMPLEMENTATION:** Solve radial equation | Pending | | |
| [ ] | **IMPLEMENTATION:** Extract phase shifts | Pending | | |
| [ ] | **IMPLEMENTATION:** Calculate elastic σ | Pending | | |
| [ ] | **CHECKPOINT 3.4** | | Code submitted | |

---

# PHASE 2: NUCLEAR PHYSICS THEORY

## Module 4: Nuclear Structure

### 4.1 Basic Nuclear Properties

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Binding energy B(Z,N) | Pending | | |
| [ ] | Semi-empirical mass formula | Pending | | |
| [ ] | Nuclear radius R = r₀A^(1/3) | Pending | | |
| [ ] | Nuclear density | Pending | | |
| [ ] | Separation energies Sₙ, Sₚ, Sα | Pending | | |
| [ ] | **PRACTICE:** Calculate for Th-232 | Pending | | |
| [ ] | **CHECKPOINT 4.1** | | HW submitted | |

---

### 4.2 Nuclear Shell Model

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Magic numbers | Pending | | |
| [ ] | Mean-field potential | Pending | | |
| [ ] | Single-particle levels | Pending | | |
| [ ] | Shell gaps | Pending | | |
| [ ] | Pairing correlations | Pending | | |
| [ ] | Ground state configurations | Pending | | |
| [ ] | **APPLICATION:** Th-232 structure | Pending | | |
| [ ] | **CHECKPOINT 4.2** | | HW submitted | |

---

### 4.3 Collective Motion

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Deformation parameters β₂, β₄ | Pending | | |
| [ ] | Rotational bands | Pending | | |
| [ ] | Vibrational modes | Pending | | |
| [ ] | Giant Dipole Resonance | Pending | | |
| [ ] | GDR in deformed nuclei | Pending | | |
| [ ] | **CHECKPOINT 4.3** | | HW submitted | |

---

### 4.4 Nuclear Level Density (CRITICAL for TALYS)

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Definition ρ(E) = dN/dE | Pending | | |
| [ ] | Fermi gas model | Pending | | |
| [ ] | Level density parameter a | Pending | | |
| [ ] | Effective excitation energy U | Pending | | |
| [ ] | Back-shifted Fermi gas | Pending | | |
| [ ] | Constant temperature model | Pending | | |
| [ ] | Microscopic approaches | Pending | | |
| [ ] | **TALYS:** ldmodel 1-6 comparison | Pending | | |
| [ ] | **CHECKPOINT 4.4** | | HW submitted | |

---

## Module 5: Nuclear Reactions (CORE MODULE)

### 5.1 Reaction Mechanisms

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Direct reactions (~10⁻²² s) | Pending | | |
| [ ] | Compound nucleus (~10⁻¹⁶ s) | Pending | | |
| [ ] | Pre-equilibrium (intermediate) | Pending | | |
| [ ] | Bohr independence hypothesis | Pending | | |
| [ ] | **CHECKPOINT 5.1** | | HW submitted | |

---

### 5.2 Compound Nucleus Model

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Formation cross-section | Pending | | |
| [ ] | Transmission coefficients | Pending | | |
| [ ] | Statistical decay | Pending | | |
| [ ] | **CHECKPOINT 5.2** | | HW submitted | |

---

### 5.3 Hauser-Feshbach Theory (THE HEART OF TALYS)

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Master equation derivation | Pending | | |
| [ ] | Entrance channel a | Pending | | |
| [ ] | Exit channel b | Pending | | |
| [ ] | Angular momentum coupling | Pending | | |
| [ ] | Parity conservation | Pending | | |
| [ ] | Statistical factor gⱼ | Pending | | |
| [ ] | Transmission coefficients Tₐʲ | Pending | | |
| [ ] | Sum over all channels | Pending | | |
| [ ] | Width fluctuation corrections | Pending | | |
| [ ] | Moldauer prescription | Pending | | |
| [ ] | **DERIVATION:** σ(n,γ) formula | Pending | | |
| [ ] | **CHECKPOINT 5.3** | | HW submitted | |

---

### 5.4 Gamma-Ray Transmission

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | E1, M1, E2 transitions | Pending | | |
| [ ] | Selection rules | Pending | | |
| [ ] | Gamma strength function | Pending | | |
| [ ] | Giant Dipole Resonance (Lorentzian) | Pending | | |
| [ ] | **TALYS:** strength 8, 9, 10 | Pending | | |
| [ ] | **CHECKPOINT 5.4** | | HW submitted | |

---

### 5.5 Fission (for Actinides)

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Fission barrier concept | Pending | | |
| [ ] | Double-humped barrier | Pending | | |
| [ ] | Liquid drop + shell corrections | Pending | | |
| [ ] | Transition states | Pending | | |
| [ ] | Fission vs neutron emission competition | Pending | | |
| [ ] | **CHECKPOINT 5.5** | | HW submitted | |

---

## Module 6: Neutron Capture (Specialized)

### 6.1 Thermal and Resonance Region

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | 1/v law derivation | Pending | | |
| [ ] | Resolved resonances | Pending | | |
| [ ] | Westcott g-factors | Pending | | |
| [ ] | Resonance integrals | Pending | | |
| [ ] | **CHECKPOINT 6.1** | | HW submitted | |

---

### 6.2 Unresolved Resonance Region

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Statistical treatment | Pending | | |
| [ ] | Average parameters ⟨Γₙ⟩, ⟨Γᵧ⟩, D | Pending | | |
| [ ] | Strength function S₀ | Pending | | |
| [ ] | **CHECKPOINT 6.2** | | HW submitted | |

---

### 6.3 Fast Neutron Region

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Hauser-Feshbach regime | Pending | | |
| [ ] | Pre-equilibrium contributions | Pending | | |
| [ ] | Competition: (n,n'), (n,2n), (n,f) | Pending | | |
| [ ] | **CHECKPOINT 6.3** | | HW submitted | |

---

### 6.4 Maxwellian-Averaged Cross Sections

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | MACS formula | Pending | | |
| [ ] | Astrophysical applications | Pending | | |
| [ ] | s-process nucleosynthesis | Pending | | |
| [ ] | **IMPLEMENTATION:** Calculate MACS | Pending | | |
| [ ] | **CHECKPOINT 6.4** | | Code submitted | |

---

# PHASE 3: COMPUTATIONAL SKILLS

## Module 7: Programming

### 7.1 Python for Nuclear Physics

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | NumPy arrays | Pending | | |
| [ ] | SciPy integration | Pending | | |
| [ ] | SciPy interpolation | Pending | | |
| [ ] | SciPy optimization | Pending | | |
| [ ] | Matplotlib plotting | Pending | | |
| [ ] | Pandas data handling | Pending | | |
| [ ] | **PROJECT:** Parse EXFOR data | Pending | | |
| [ ] | **PROJECT:** Implement χ² fitting | Pending | | |
| [ ] | **PROJECT:** Publication plots | Pending | | |
| [ ] | **PROJECT:** TALYS automation | Pending | | |
| [ ] | **CHECKPOINT 7.1** | | Projects submitted | |

---

### 7.2 Fortran Basics

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Syntax and data types | Pending | | |
| [ ] | Arrays and loops | Pending | | |
| [ ] | Subroutines and functions | Pending | | |
| [ ] | File I/O | Pending | | |
| [ ] | **PRACTICE:** Read TALYS source | Pending | | |
| [ ] | **CHECKPOINT 7.2** | | Code review | |

---

## Module 8: Nuclear Data and Codes

### 8.1 TALYS Mastery

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | Input file structure | Pending | | |
| [ ] | Output file formats | Pending | | |
| [ ] | Key parameter: ldmodel | Pending | | |
| [ ] | Key parameter: strength | Pending | | |
| [ ] | Key parameter: localomp/globalomp | Pending | | |
| [ ] | Key parameter: preequilibrium | Pending | | |
| [ ] | **RUN:** Basic calculations | Pending | | |
| [ ] | **RUN:** Parameter sensitivity | Pending | | |
| [ ] | **RUN:** Compare with EXFOR | Pending | | |
| [ ] | **CHECKPOINT 8.1** | | TALYS runs submitted | |

---

### 8.2 Nuclear Databases

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | EXFOR database | Pending | | |
| [ ] | EXFOR data retrieval | Pending | | |
| [ ] | ENDF format (MF/MT) | Pending | | |
| [ ] | ENDF/B, JEFF, JENDL comparison | Pending | | |
| [ ] | RIPL library | Pending | | |
| [ ] | **CHECKPOINT 8.2** | | Data analysis submitted | |

---

## Module 9: Research Methodology

### 9.1 Literature and Writing

| Status | Topic | Lesson | Practice | Notes |
|--------|-------|--------|----------|-------|
| [ ] | How to read nuclear physics papers | Pending | | |
| [ ] | Statistical vs systematic uncertainties | Pending | | |
| [ ] | Error propagation | Pending | | |
| [ ] | Paper structure | Pending | | |
| [ ] | **CHECKPOINT 9.1** | | Paper review submitted | |

---

# PHASE 4: RESEARCH PROJECT

## Th-232(n,γ) Cross-Section Calculation

| Status | Task | Notes |
|--------|------|-------|
| [ ] | Gather all EXFOR Th-232(n,γ) data | |
| [ ] | Set up TALYS input for Th-232 | |
| [ ] | Run baseline calculation | |
| [ ] | Compare with experimental data | |
| [ ] | Identify discrepancies | |
| [ ] | Parameter optimization | |
| [ ] | Uncertainty quantification | |
| [ ] | Write results section | |
| [ ] | Prepare publication figures | |
| [ ] | Draft full paper | |
| [ ] | **PROJECT COMPLETE** | |

---

# CURRENT SESSION TRACKER

## Last Session
- **Date:** February 17, 2026
- **Topic covered:** Module 1.1 - Vector Spaces Basics
- **Homework assigned:** Q1-Q18 (all completed)
- **Status:** COMPLETE

## Next Session
- **Topic:** Module 1.1 - Hilbert Spaces
- **Preparation:** Review vector spaces, basis, dimension

---

# SESSION LOG

| Date | Module | Topic | Homework | Status |
|------|--------|-------|----------|--------|
| Feb 17, 2026 | 1.1 | Vector Spaces Basics | Q1-Q18 | Complete |

---

# NOTES AND QUESTIONS

## My Questions for Next Session:
(Write your questions here)

## Concepts I'm Struggling With:
(Track difficult topics here)

## Key Insights:
(Record important understandings)

---

**To resume:** Tell me "Let's continue" and I'll check this file to see where we left off.
