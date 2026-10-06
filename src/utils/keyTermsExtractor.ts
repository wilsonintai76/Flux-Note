export interface PDFKeyTerm {
  id: string;
  term: string;
  page: number;
  category: 'heading' | 'theorem' | 'concept' | 'problem' | 'definition';
  snippet: string;
  importance?: 'high' | 'medium';
}

// Curated Key Terms for built-in academic tutorial templates
const CURATED_TEMPLATE_TERMS: Record<string, PDFKeyTerm[]> = {
  'tutorial-linear-algebra': [
    {
      id: 'term-la-1',
      term: 'Characteristic Polynomial',
      page: 1,
      category: 'concept',
      snippet: 'p(λ) = det(A - λI), roots give eigenvalues and algebraic multiplicities.',
      importance: 'high',
    },
    {
      id: 'term-la-2',
      term: 'Problem 1. Characteristic Polynomial & Eigenvalues',
      page: 1,
      category: 'problem',
      snippet: 'Compute eigenvalues of 3x3 symmetric matrix A and geometric multiplicity for λ = 3.',
      importance: 'high',
    },
    {
      id: 'term-la-3',
      term: 'Problem 2. Orthogonal Diagonalization',
      page: 1,
      category: 'problem',
      snippet: 'Construct orthogonal matrix Q such that Qᵀ A Q = D with Gram-Schmidt.',
      importance: 'high',
    },
    {
      id: 'term-la-4',
      term: 'Gram-Schmidt Process',
      page: 1,
      category: 'theorem',
      snippet: 'Orthogonalization algorithm converting linearly independent vectors into an orthonormal basis.',
      importance: 'high',
    },
    {
      id: 'term-la-5',
      term: 'Problem 3. Singular Value Decomposition (SVD)',
      page: 2,
      category: 'problem',
      snippet: 'Calculate MᵀM and find singular values σ₁ ≥ σ₂ for non-square matrix M.',
      importance: 'high',
    },
    {
      id: 'term-la-6',
      term: 'Eckart-Young-Mirsky Theorem',
      page: 2,
      category: 'theorem',
      snippet: 'Optimal low-rank approximation of a matrix in Frobenius and spectral norms via truncated SVD.',
      importance: 'high',
    },
    {
      id: 'term-la-7',
      term: 'Problem 4. Positive Definite Quadratic Forms',
      page: 2,
      category: 'problem',
      snippet: 'Prove Q(x) = xᵀAx > 0 for all non-zero x using Sylvester\'s criterion.',
      importance: 'high',
    },
    {
      id: 'term-la-8',
      term: 'Sylvester\'s Criterion',
      page: 2,
      category: 'theorem',
      snippet: 'A Hermitian matrix is positive-definite iff all leading principal minors are strictly positive.',
      importance: 'medium',
    },
    {
      id: 'term-la-9',
      term: 'Spectral Theorem',
      page: 1,
      category: 'theorem',
      snippet: 'Every real symmetric matrix is orthogonally diagonalizable with all real eigenvalues.',
      importance: 'high',
    }
  ],
  'tutorial-quantum-lecture': [
    {
      id: 'term-qt-1',
      term: 'Lecture 09: Quantum Gate Teleportation',
      page: 1,
      category: 'heading',
      snippet: 'Department of Applied Physics • Advanced Quantum Computing Lecture & Exercises.',
      importance: 'high',
    },
    {
      id: 'term-qt-2',
      term: 'Quantum Teleportation Protocol',
      page: 1,
      category: 'concept',
      snippet: 'Faithful transmission of an unknown qubit |ψ⟩ through EPR channel + 2 classical bits.',
      importance: 'high',
    },
    {
      id: 'term-qt-3',
      term: 'Bell State (|Φ⁺⟩)',
      page: 1,
      category: 'definition',
      snippet: '|Φ⁺⟩ = (1 / √2) (|00⟩ + |11⟩) maximally entangled 2-qubit state.',
      importance: 'high',
    },
    {
      id: 'term-qt-4',
      term: 'EPR Pair Channel',
      page: 1,
      category: 'concept',
      snippet: 'Einstein-Podolsky-Rosen entangled pair shared between Alice and Bob prior to protocol.',
      importance: 'medium',
    },
    {
      id: 'term-qt-5',
      term: 'Bell State Measurement',
      page: 2,
      category: 'concept',
      snippet: 'Alice applies CNOT gate on unknown state and EPR half, followed by Hadamard transform H.',
      importance: 'high',
    },
    {
      id: 'term-qt-6',
      term: 'Bob\'s Pauli Corrections',
      page: 2,
      category: 'concept',
      snippet: 'Bob applies Pauli X, Z, or XZ unitary gates conditional on Alice\'s 2 measurement outcomes.',
      importance: 'high',
    },
    {
      id: 'term-qt-7',
      term: 'Gate Teleportation & Fault Tolerance',
      page: 3,
      category: 'heading',
      snippet: 'Gottesman-Chuang (1999) protocol for applying non-Clifford gates on encoded states.',
      importance: 'high',
    },
    {
      id: 'term-qt-8',
      term: 'Magic State Distillation',
      page: 3,
      category: 'concept',
      snippet: 'Consuming noisy ancilla states to synthesize high-fidelity T-gates bypassing Eastin-Knill theorem.',
      importance: 'high',
    },
    {
      id: 'term-qt-9',
      term: 'Eastin-Knill Theorem',
      page: 3,
      category: 'theorem',
      snippet: 'No quantum error-correcting code can implement a universal set of logical gates transversally.',
      importance: 'medium',
    }
  ],
  'tutorial-systems-algorithms': [
    {
      id: 'term-cs-1',
      term: 'Tutorial 07: Distributed Consensus',
      page: 1,
      category: 'heading',
      snippet: 'Distributed Systems Architecture • Leader Election & Log Replication Tutorial.',
      importance: 'high',
    },
    {
      id: 'term-cs-2',
      term: 'Raft Consensus Protocol',
      page: 1,
      category: 'concept',
      snippet: 'Understandable distributed consensus algorithm dividing problems into election, replication, safety.',
      importance: 'high',
    },
    {
      id: 'term-cs-3',
      term: 'Leader Election & Term Numbers',
      page: 1,
      category: 'concept',
      snippet: 'Randomized election timeouts avoiding split votes when cluster nodes transition to candidate.',
      importance: 'high',
    },
    {
      id: 'term-cs-4',
      term: 'Log Replication & Quorum',
      page: 2,
      category: 'concept',
      snippet: 'AppendEntries RPCs ensuring committed entries survive future leader changes via majority quorum.',
      importance: 'high',
    },
    {
      id: 'term-cs-5',
      term: 'CAP Theorem & Network Partitions',
      page: 2,
      category: 'theorem',
      snippet: 'Consistency, Availability, Partition Tolerance trade-offs during asymmetric network splits.',
      importance: 'medium',
    }
  ]
};

/**
 * Extracts key technical terms and headings from a document's page texts or template ID.
 */
export function extractKeyTermsFromDocument(
  activeTemplateId: string | undefined,
  pageTexts?: Record<number, string>,
  totalPages: number = 4
): PDFKeyTerm[] {
  // 1. If using a known template with rich curated terms
  const templateKey = activeTemplateId || (pageTexts ? undefined : 'tutorial-linear-algebra');
  if (templateKey && CURATED_TEMPLATE_TERMS[templateKey]) {
    return CURATED_TEMPLATE_TERMS[templateKey];
  }

  // 2. Automated extraction for any uploaded PDF file
  const extractedTerms: PDFKeyTerm[] = [];
  const seenTerms = new Set<string>();

  if (pageTexts) {
    Object.entries(pageTexts).forEach(([pageNumStr, rawText]) => {
      const page = parseInt(pageNumStr, 10);
      if (!rawText || rawText.trim().length === 0) return;

      const lines = rawText.split(/\n|\.\s+/);

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.length < 4 || trimmed.length > 90) return;

        // Pattern 1: Numbered Section / Problem Headings (e.g., "1. Abstract", "Problem 2.", "Section 4.1")
        const headingMatch = trimmed.match(/^((\d+[\.\)]|Section\s+\d+|Problem\s+\d+|Chapter\s+\d+|Part\s+[A-Z])\s+[A-Za-z0-9\s:,\-]{4,60})/i);
        if (headingMatch) {
          const term = headingMatch[1].trim();
          if (!seenTerms.has(term.toLowerCase())) {
            seenTerms.add(term.toLowerCase());
            extractedTerms.push({
              id: `term-auto-${page}-${extractedTerms.length}`,
              term,
              page,
              category: term.toLowerCase().includes('problem') ? 'problem' : 'heading',
              snippet: trimmed.substring(0, 110),
              importance: 'high',
            });
          }
        }

        // Pattern 2: Theorems, Lemmas, Definitions (e.g., "Theorem 3.1:", "Definition:", "Lemma:")
        const theoremMatch = trimmed.match(/\b(Theorem|Definition|Lemma|Corollary|Proposition|Algorithm|Criterion)\s*(\d+(\.\d+)?)?[:\-\s]+([A-Z][A-Za-z0-9\s,\-]{3,45})/i);
        if (theoremMatch) {
          const term = theoremMatch[0].trim().replace(/[:\-]$/, '');
          if (!seenTerms.has(term.toLowerCase())) {
            seenTerms.add(term.toLowerCase());
            extractedTerms.push({
              id: `term-auto-${page}-${extractedTerms.length}`,
              term,
              page,
              category: term.toLowerCase().includes('definition') ? 'definition' : 'theorem',
              snippet: trimmed.substring(0, 110),
              importance: 'high',
            });
          }
        }

        // Pattern 3: Capitalized Multi-word Technical Concepts (e.g., "Matrix Diagonalization", "Quantum Teleportation")
        const conceptMatches = trimmed.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g);
        if (conceptMatches) {
          conceptMatches.forEach((concept) => {
            const clean = concept.trim();
            if (
              clean.length > 8 &&
              !clean.startsWith('The ') &&
              !clean.startsWith('This ') &&
              !clean.startsWith('Figure ') &&
              !clean.startsWith('Table ') &&
              !seenTerms.has(clean.toLowerCase())
            ) {
              seenTerms.add(clean.toLowerCase());
              extractedTerms.push({
                id: `term-auto-${page}-${extractedTerms.length}`,
                term: clean,
                page,
                category: 'concept',
                snippet: trimmed.substring(0, 110),
                importance: 'medium',
              });
            }
          });
        }
      });
    });
  }

  // If extraction yielded terms, return them
  if (extractedTerms.length > 0) {
    return extractedTerms.slice(0, 30);
  }

  // Fallback default terms if text extraction was sparse
  return CURATED_TEMPLATE_TERMS['tutorial-linear-algebra'] || [];
}
