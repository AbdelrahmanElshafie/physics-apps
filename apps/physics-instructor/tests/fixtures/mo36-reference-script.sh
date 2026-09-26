#!/bin/bash
#================================================================
#  GRASP2018 Calculation for Mo36+ (Carbon-like Molybdenum)
#
#  Ion: Mo36+ (Z=42, 6 electrons)
#  Ground configuration: 1s² 2s² 2p²
#  Ground state: ³P₀
#
#  Author: Generated for GRASP2018 tutorial
#  Date: January 2026
#================================================================

#--- Setup Environment ---
export GRASP=/home/bodo/GRASP2018
export PATH=$GRASP/bin:$PATH

#--- Working Directory ---
cd ~/Mo36_calculation
echo "Working in: $(pwd)"
echo ""

#================================================================
# STEP 1: NUCLEAR DATA (rnucleus)
#================================================================
echo "==== STEP 1: Nuclear Data ===="
echo "Creating isodata file for Mo (Z=42, A=98)..."

# Input: Z=42, A=98, no revision, static nucleus, I=0, mu=0, Q=0
rnucleus << EOF
42
98
n
0
0
0
0
EOF

echo "Done. Created: isodata"
echo ""

#================================================================
# STEP 2: GENERATE CSFs (rcsfgenerate)
#================================================================
echo "==== STEP 2a: Even Parity CSFs ===="
echo "Configuration: 2s²2p² with excitations to n=3..."

# Clean previous files
rm -f rcsf.out excitationdata clist.new rcsfgenerate.log

# Even parity: 2s(2,*)2p(2,*) with SD excitations to 3s,3p,3d
rcsfgenerate << EOF
*
1
2s(2,*)2p(2,*)
*
3s,3p,3d
0 4
2
n
y
EOF

mv rcsf.out even.c
echo "Done. Created: even.c"
echo ""

#----------------------------------------------------------------
echo "==== STEP 2b: Odd Parity CSFs ===="
echo "Configuration: 2s 2p³ with excitations to n=3..."

rm -f rcsf.out excitationdata clist.new rcsfgenerate.log

# Odd parity: 2s(1,*)2p(3,*)
rcsfgenerate << EOF
*
1
2s(1,*)2p(3,*)
*
3s,3p,3d
0 6
2
n
y
EOF

mv rcsf.out odd.c
echo "Done. Created: odd.c"
echo ""

#================================================================
# STEP 3: ANGULAR COEFFICIENTS (rangular)
#================================================================
echo "==== STEP 3a: Angular Coefficients (Even) ===="
cp even.c rcsf.inp
rangular << EOF
y
EOF
mkdir -p even_mcp
mv mcp.* even_mcp/
echo "Done. Saved to: even_mcp/"
echo ""

#----------------------------------------------------------------
echo "==== STEP 3b: Angular Coefficients (Odd) ===="
cp odd.c rcsf.inp
rangular << EOF
y
EOF
mkdir -p odd_mcp
mv mcp.* odd_mcp/
echo "Done. Saved to: odd_mcp/"
echo ""

#================================================================
# STEP 4: ESTIMATE WAVEFUNCTIONS (rwfnestimate)
# STEP 5: MCDHF CALCULATION (rmcdhf)
#================================================================
echo "==== STEP 4-5a: MCDHF (Even Parity) ===="
cp even.c rcsf.inp
cp even_mcp/mcp.* .

# Estimate initial wavefunctions using Thomas-Fermi
rwfnestimate << EOF
y
2
*
EOF

# Run MCDHF (3 blocks: J=0+, 1+, 2+)
rmcdhf << EOF
y
1
1
1
5
*
1s,2s,2p-,2p
100
EOF

cp rwfn.out even.w
cp rmix.out even.m
echo "Done. Created: even.w, even.m"
echo ""

#----------------------------------------------------------------
echo "==== STEP 4-5b: MCDHF (Odd Parity) ===="
cp odd.c rcsf.inp
rm -f mcp.*
cp odd_mcp/mcp.* .

rwfnestimate << EOF
y
2
*
EOF

# Run MCDHF (4 blocks: J=0-, 1-, 2-, 3-)
rmcdhf << EOF
y
1
1
1
1
5
*
1s,2s,2p-,2p
100
EOF

cp rwfn.out odd.w
cp rmix.out odd.m
echo "Done. Created: odd.w, odd.m"
echo ""

#================================================================
# STEP 6: CI CALCULATION WITH QED (rci)
#================================================================
echo "==== STEP 6a: CI Calculation (Even Parity) ===="
echo "Including: Breit, Vacuum Polarization, Mass Shifts, Self-Energy"
cp even.c rcsf.inp
cp even.w rwfn.inp
rm -f mcp.*
cp even_mcp/mcp.* .

rci << EOF
y
even
y
n
y
y
y
y
3
1-10
1-10
1-10
EOF

echo "Done. Created: even.cm, even.csum"
echo ""

#----------------------------------------------------------------
echo "==== STEP 6b: CI Calculation (Odd Parity) ===="
cp odd.c rcsf.inp
cp odd.w rwfn.inp
rm -f mcp.*
cp odd_mcp/mcp.* .

rci << EOF
y
odd
y
n
y
y
y
y
3
1-10
1-10
1-10
1-10
EOF

echo "Done. Created: odd.cm, odd.csum"
echo ""

#================================================================
# STEP 7: CONVERT TO LS-COUPLING (jj2lsj)
#================================================================
echo "==== STEP 7: LSJ Transformation ===="

jj2lsj_2025 << EOF
even
y
n
y
EOF

jj2lsj_2025 << EOF
odd
y
n
y
EOF

echo "Done. Created: even.lsj.lbl, odd.lsj.lbl"
echo ""

#================================================================
# STEP 8: ENERGY LEVEL TABLE (rlevels)
#================================================================
echo "==== STEP 8: Energy Level Table ===="

rlevels << EOF
even.cm
odd.cm

EOF

echo ""

#================================================================
# STEP 9: LATEX TABLE (lscomp.pl)
#================================================================
echo "==== STEP 9: LaTeX Table ===="

perl $GRASP/bin/lscomp.pl << EOF
even
odd
n
n
6
EOF

echo "Done. Created: lscomp.tex"
echo ""

#================================================================
# SUMMARY
#================================================================
echo "========================================"
echo "  CALCULATION COMPLETE!"
echo "========================================"
echo ""
echo "Output files:"
ls -la *.c *.w *.cm *.lsj.lbl lscomp.tex 2>/dev/null
echo ""
echo "View energy levels:  cat energy_levels.txt"
echo "View LS-composition: head -30 even.lsj.lbl"
echo "Compile LaTeX:       pdflatex lscomp.tex"
