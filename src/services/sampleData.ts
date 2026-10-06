import { Note, NotebookFolder } from '../types/note';

export const DEFAULT_FOLDERS: NotebookFolder[] = [
  { id: 'university', name: 'University & Academics', iconName: 'GraduationCap', color: '#3b82f6', description: 'Lectures, problem sets, and course summaries' },
  { id: 'research', name: 'Research & Literature', iconName: 'BookOpen', color: '#10b981', description: 'Papers, links, quotes, and research synthesis' },
  { id: 'ideas', name: 'Quick Ideas & Canvas', iconName: 'Sparkles', color: '#8b5cf6', description: 'Mind maps, diagrams, and infinite brainstorm boards' },
  { id: 'personal', name: 'Personal & Journal', iconName: 'User', color: '#f59e0b', description: 'Daily reflections, reading lists, and work logs' },
];

export const SAMPLE_AUDIO_BEEP_BASE64 = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA';

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-distributed-consensus',
    title: 'Distributed Consensus & Paxos Fundamentals',
    type: 'page',
    folderId: 'university',
    tags: ['CS402', 'distributed-systems', 'algorithms', 'exam-prep'],
    isPinned: true,
    isArchived: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 30,
    content: `# Distributed Consensus & Paxos Fundamentals

## Overview
Reaching agreement among a cluster of nodes subject to network delays, partitions, and node crashes is one of the foundational challenges of distributed computing.

> "Consensus is the process of agreeing on one result among a group of participants. This problem becomes difficult when participants or their communication medium may experience failures."

### Key Invariants
- **Validity**: If a process decides $v$, then $v$ must have been proposed by some process.
- **Agreement**: No two non-faulty processes decide different values.
- **Integrity**: Each process decides at most once.
- **Termination**: Every non-faulty process eventually decides some value (under synchronous/partially synchronous assumptions; see FLP Impossibility).

## Contrast with Other Protocols
See the comparative breakdown in [[Raft Consensus Algorithm]] and [[Interactive Systems & Spatial Canvas]].

### Phase 1: Prepare & Promise
1. Proposer chooses proposal number $n$ and sends a **Prepare(n)** request to a majority of Acceptors.
2. Acceptor receives **Prepare(n)**. If $n >$ any previous proposal number received, it promises not to accept proposals $< n$, and sends back its highest accepted proposal $(v, k)$.

### Phase 2: Accept & Learn
1. If Proposer receives responses from a majority, it chooses value $v$ (the value with highest number among responses, or its own value if none).
2. Proposer broadcasts **Accept(n, v)**.
3. Acceptor accepts if it has not responded to a **Prepare(n')** with $n' > n$.

## Action Items & Exam Review
- [x] Review Leslie Lamport's original 1998 paper *The Part-Time Parliament*
- [x] Prove state machine replication safety over unreliable networks
- [ ] Practice 2-Phase Commit vs Paxos edge cases for Thursday seminar`,
    inlineInks: [
      {
        id: 'ink-diagram-1',
        title: 'Phase 1 & 2 Message Flow Diagram',
        height: 180,
        createdAt: Date.now() - 1000 * 60 * 60 * 40,
        strokes: [
          {
            id: 's1',
            tool: 'pen',
            color: '#2563eb',
            width: 2.5,
            opacity: 1,
            points: [
              { x: 50, y: 30 }, { x: 50, y: 150 },
              { x: 220, y: 30 }, { x: 220, y: 150 },
              { x: 390, y: 30 }, { x: 390, y: 150 }
            ]
          },
          {
            id: 's2',
            tool: 'pen',
            color: '#dc2626',
            width: 2,
            opacity: 1,
            points: [
              { x: 55, y: 55 }, { x: 120, y: 65 }, { x: 215, y: 75 }
            ]
          },
          {
            id: 's3',
            tool: 'highlighter',
            color: '#facc15',
            width: 14,
            opacity: 0.35,
            points: [
              { x: 200, y: 70 }, { x: 380, y: 80 }
            ]
          }
        ]
      }
    ],
    images: [
      {
        id: 'img-cluster-topology',
        url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="600" height="300" rx="16" fill="%23f5f4f0"/><rect x="40" y="40" width="140" height="90" rx="12" fill="%23ffffff" stroke="%233b82f6" stroke-width="2"/><text x="110" y="80" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231e3a8a" text-anchor="middle">Proposer P1</text><text x="110" y="105" font-family="sans-serif" font-size="11" fill="%2364748b" text-anchor="middle">Leader (Active)</text><rect x="230" y="40" width="140" height="90" rx="12" fill="%23ffffff" stroke="%2310b981" stroke-width="2"/><text x="300" y="80" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23064e3b" text-anchor="middle">Acceptor A1</text><text x="300" y="105" font-family="sans-serif" font-size="11" fill="%2364748b" text-anchor="middle">Quorum Node 1</text><rect x="420" y="40" width="140" height="90" rx="12" fill="%23ffffff" stroke="%2310b981" stroke-width="2"/><text x="490" y="80" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23064e3b" text-anchor="middle">Acceptor A2</text><text x="490" y="105" font-family="sans-serif" font-size="11" fill="%2364748b" text-anchor="middle">Quorum Node 2</text><rect x="230" y="170" width="140" height="90" rx="12" fill="%23ffffff" stroke="%2310b981" stroke-width="2"/><text x="300" y="210" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23064e3b" text-anchor="middle">Acceptor A3</text><text x="300" y="235" font-family="sans-serif" font-size="11" fill="%2364748b" text-anchor="middle">Quorum Node 3</text><path d="M180 85 L230 85" stroke="%233b82f6" stroke-width="2" marker-end="url(%23arrow)"/><path d="M180 85 L420 85" stroke="%233b82f6" stroke-dasharray="4" stroke-width="1.5"/><path d="M180 85 L230 215" stroke="%233b82f6" stroke-dasharray="4" stroke-width="1.5"/><text x="300" y="285" font-family="sans-serif" font-size="12" fill="%2378716c" text-anchor="middle">Figure 1.2: Majority Quorum Intersection (2 out of 3 Acceptors)</text></svg>',
        caption: 'Figure 1.2: Majority Quorum Topology & Message Heartbeat',
        width: 600,
        height: 300,
        createdAt: Date.now() - 1000 * 60 * 60 * 36,
        strokes: [
          {
            id: 'callout-circle-1',
            tool: 'pen',
            color: '#ef4444',
            width: 3.5,
            opacity: 1,
            points: [
              { x: 300, y: 35, pressure: 0.8 },
              { x: 375, y: 70, pressure: 0.9 },
              { x: 375, y: 125, pressure: 0.85 },
              { x: 295, y: 135, pressure: 0.7 },
              { x: 225, y: 95, pressure: 0.65 },
              { x: 235, y: 45, pressure: 0.6 },
              { x: 300, y: 35, pressure: 0.75 }
            ]
          },
          {
            id: 'callout-highlighter-1',
            tool: 'highlighter',
            color: '#facc15',
            width: 16,
            opacity: 0.38,
            points: [
              { x: 40, y: 285, pressure: 0.9 },
              { x: 560, y: 285, pressure: 0.9 }
            ]
          }
        ]
      }
    ],
    audioRecordings: [
      {
        id: 'rec-paxos-summary',
        title: 'Professor Miller - L08 Paxos Clarification',
        durationSeconds: 94,
        timestamp: Date.now() - 1000 * 60 * 60 * 46,
        audioData: SAMPLE_AUDIO_BEEP_BASE64,
        waveform: [20, 35, 55, 80, 65, 45, 90, 75, 60, 40, 30, 70, 85, 95, 60, 40, 25, 50, 65, 30],
        transcript: 'During Phase 1 of Paxos, the proposer sends a Prepare(n) request to a majority of acceptors. Each acceptor replies with a Promise if n is greater than any proposal number it has observed so far, returning its highest accepted value. In Phase 2, once the proposer receives promises from a quorum, it issues an Accept(n, v) request to commit the value across the distributed cluster.',
        transcriptSegments: [
          { timestamp: 0, text: 'During Phase 1 of Paxos, the proposer sends a Prepare(n) request to a majority of acceptors.' },
          { timestamp: 28, text: 'Each acceptor replies with a Promise if n is greater than any proposal number it has observed so far, returning its highest accepted value.' },
          { timestamp: 58, text: 'In Phase 2, once the proposer receives promises from a quorum, it issues an Accept(n, v) request to commit the value across the distributed cluster.' }
        ]
      }
    ],
    versions: [
      {
        id: 'v1',
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        title: 'Initial Lecture Notes: Paxos',
        contentSummary: 'First draft during Lecture 08',
        fullContent: '# Distributed Consensus\nFirst notes taken in class.',
        authorLabel: 'Local Session'
      },
      {
        id: 'v2',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
        title: 'Added Phase 1 & Phase 2 Invariants',
        contentSummary: 'Detailed 2-phase protocol steps and Lamport paper citation',
        fullContent: '# Distributed Consensus & Paxos Fundamentals\nExpanded with proof sketches.',
        authorLabel: 'Local Session'
      }
    ]
  },

  {
    id: 'note-raft-consensus',
    title: 'Raft Consensus Algorithm',
    type: 'page',
    folderId: 'university',
    tags: ['CS402', 'consensus', 'distributed-systems'],
    isPinned: false,
    isArchived: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
    content: `# Raft Consensus Algorithm

Raft was explicitly designed by Ongaro & Ousterhout (Stanford) as an understandable alternative to Paxos.

### Primary Roles
- **Leader**: Handles all client requests, replicates log entries.
- **Follower**: Passive, responds to incoming RPCs from candidate or leader.
- **Candidate**: Used during leader election elections.

### Key Invariant References
See foundational theory in [[Distributed Consensus & Paxos Fundamentals]].

### Terms & Heartbeats
Time is divided into arbitrary terms, numbered with consecutive integers.
- If a follower receives no communication over an **Election Timeout** (typically 150ms-300ms randomized), it assumes there is no viable leader and initiates an election.
- Heartbeats are broadcast periodically by the leader as empty \`AppendEntries\` RPCs.`,
    audioRecordings: [],
    versions: []
  },

  {
    id: 'note-spatial-canvas-board',
    title: 'Interactive Systems & Spatial Canvas Architecture',
    type: 'canvas',
    folderId: 'ideas',
    tags: ['architecture', 'canvas', 'hci', 'design-systems'],
    isPinned: true,
    isArchived: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 96,
    updatedAt: Date.now() - 1000 * 60 * 45,
    content: 'Spatial map linking note topologies, stylus pipelines, and state storage.',
    canvasView: { x: 80, y: 60, zoom: 0.95 },
    canvasNodes: [
      {
        id: 'node-core-pipeline',
        type: 'card',
        x: 100,
        y: 120,
        width: 280,
        height: 180,
        title: 'Touch & Stylus Engine',
        content: 'Captures raw pointer events, pressure dynamics, bezier smoothing, and palm-rejection heuristics.',
        color: '#f8fafc',
        data: { author: 'Input Subsystem' }
      },
      {
        id: 'node-sticky-perf',
        type: 'sticky',
        x: 440,
        y: 80,
        width: 220,
        height: 170,
        content: 'Keep frame budget under 16ms during active 120Hz pen strokes. Use offscreen canvas caching!',
        color: '#fef08a'
      },
      {
        id: 'node-shape-state',
        type: 'shape',
        shapeType: 'pill',
        x: 140,
        y: 370,
        width: 200,
        height: 60,
        title: 'IndexedDB Store',
        content: 'Local snapshot persistence',
        color: '#dbeafe'
      },
      {
        id: 'node-research-link',
        type: 'research',
        x: 440,
        y: 310,
        width: 320,
        height: 220,
        title: 'Cognitive Offloading in Spatial Workspaces',
        content: '"Spatial arrangement externalizes working memory, providing indexed topological access to ideas."',
        color: '#f0fdf4',
        data: {
          author: 'Kirsh & Maglio (Cognitive Science)',
          url: 'https://doi.org/10.1016/j.cogsci.2023.04'
        }
      },
      {
        id: 'node-sticky-backlink',
        type: 'sticky',
        x: 820,
        y: 180,
        width: 220,
        height: 180,
        content: 'Connects directly with [[Distributed Consensus & Paxos Fundamentals]] for collaborative multi-peer sync.',
        color: '#fed7aa'
      }
    ],
    canvasEdges: [
      { id: 'e1', fromNodeId: 'node-core-pipeline', toNodeId: 'node-sticky-perf', label: '120Hz buffer', style: 'solid', color: '#64748b' },
      { id: 'e2', fromNodeId: 'node-core-pipeline', toNodeId: 'node-shape-state', label: 'syncs to', style: 'dashed', color: '#3b82f6' },
      { id: 'e3', fromNodeId: 'node-sticky-perf', toNodeId: 'node-research-link', label: 'grounded in', style: 'solid', color: '#10b981' }
    ],
    canvasStrokes: [
      {
        id: 'cs1',
        tool: 'pen',
        color: '#7c3aed',
        width: 3,
        opacity: 0.9,
        points: [
          { x: 240, y: 300 }, { x: 240, y: 340 }, { x: 235, y: 360 }
        ]
      },
      {
        id: 'cs2',
        tool: 'highlighter',
        color: '#a7f3d0',
        width: 18,
        opacity: 0.4,
        points: [
          { x: 440, y: 320 }, { x: 740, y: 320 }
        ]
      }
    ]
  },

  {
    id: 'note-attention-research',
    title: 'Research: Attention Mechanisms & Sparse Transformers',
    type: 'research',
    folderId: 'research',
    tags: ['deep-learning', 'transformers', 'literature-review', 'citations'],
    isPinned: true,
    isArchived: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 120,
    updatedAt: Date.now() - 1000 * 60 * 60 * 4,
    content: 'Curated synthesis of transformer scaling, sparse attention patterns, and state space alternatives.',
    researchData: {
      url: 'https://arxiv.org/abs/1706.03762',
      sourceName: 'NeurIPS & Journal of Machine Learning Research',
      authors: 'Vaswani et al., Child et al., Dao et al.',
      publicationDate: '2023-11 Revision',
      keyTakeaways: [
        'Standard Self-Attention scales quadratically O(N²) with sequence length.',
        'FlashAttention utilizes GPU SRAM tiling to minimize memory bandwidth bottlenecks without altering mathematical output.',
        'State-Space Models (Mamba / S4) provide linear inference complexity for very long context tasks.'
      ],
      quotes: [
        {
          id: 'q1',
          quote: 'Attention is not merely a routing mechanism; it allows dynamically weighted associations conditioned directly on query-key dot products.',
          sourceNote: 'Section 3.2 Multi-Head Attention',
          pageNumber: 'Page 5',
          color: '#fef08a'
        },
        {
          id: 'q2',
          quote: 'The primary bottleneck in modern deep sequence models is no longer FLOPS, but memory access latency between HBM and SRAM.',
          sourceNote: 'FlashAttention Paper (Dao 2022)',
          pageNumber: 'Page 2',
          color: '#dbeafe'
        }
      ],
      screenshots: [
        {
          id: 'sc1',
          title: 'Scaled Dot-Product Attention Architecture',
          caption: 'Query, Key, Value computation pathways with Softmax and Scaled Division.',
          imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'sc2',
          title: 'Hardware Memory Hierarchy (HBM vs SRAM)',
          caption: 'Tiling blocks to stay within local memory cache.',
          imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80'
        }
      ],
      personalCritique: 'Crucial to connect this with our distributed systems work in [[Distributed Consensus & Paxos Fundamentals]] because model training clusters face similar partition and gradient-sync barriers.'
    }
  },

  {
    id: 'note-sample-pdf-quantum',
    title: 'Lecture 09: Quantum Gate Teleportation & Entanglement',
    type: 'pdf',
    folderId: 'university',
    tags: ['quantum', 'physics', 'lecture-slides', 'pdf-annotated'],
    isPinned: false,
    isArchived: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 200,
    updatedAt: Date.now() - 1000 * 60 * 60 * 18,
    content: 'Course slides with margin notes, highlighter strokes, and formula breakdown.',
    pdfData: {
      fileName: 'Quantum_Teleportation_Lecture09.pdf',
      totalPages: 4,
      annotations: {
        1: {
          strokes: [
            {
              id: 'pdf-s1',
              tool: 'highlighter',
              color: '#facc15',
              width: 16,
              opacity: 0.45,
              points: [{ x: 120, y: 160 }, { x: 480, y: 160 }]
            },
            {
              id: 'pdf-s2',
              tool: 'pen',
              color: '#dc2626',
              width: 2.5,
              opacity: 1,
              points: [{ x: 490, y: 155 }, { x: 540, y: 140 }, { x: 540, y: 170 }]
            }
          ],
          stickyNotes: [
            {
              id: 'pdf-n1',
              x: 550,
              y: 130,
              text: 'Bell state |Φ+⟩ = (|00⟩ + |11⟩) / √2 is required between Alice and Bob before classical communication starts.',
              color: '#fef08a',
              timestamp: Date.now() - 1000 * 60 * 60 * 15
            }
          ]
        },
        2: {
          strokes: [
            {
              id: 'pdf-s3',
              tool: 'highlighter',
              color: '#86efac',
              width: 14,
              opacity: 0.4,
              points: [{ x: 110, y: 220 }, { x: 390, y: 220 }]
            }
          ],
          stickyNotes: [
            {
              id: 'pdf-n2',
              x: 420,
              y: 200,
              text: 'No-cloning theorem guarantees that original state is destroyed upon measurement!',
              color: '#dbeafe',
              timestamp: Date.now() - 1000 * 60 * 60 * 14
            }
          ]
        }
      }
    }
  },

  {
    id: 'scratch-office-hours',
    title: 'Office hours questions for Prof. Chen',
    type: 'scratchpad',
    folderId: 'ideas',
    tags: ['scratchpad', 'office-hours', 'quick-capture'],
    isPinned: true,
    isArchived: false,
    createdAt: Date.now() - 1000 * 60 * 45,
    updatedAt: Date.now() - 1000 * 60 * 45,
    content: `1. Question on Byzantine fault tolerance in asynchronous networks: why is 3f+1 minimum?
2. Ask if homework 4 problem 3 allows pseudocode or needs actual TLA+ specs.
3. Pick up corrected quiz from TA cabinet.`,
    scratchpadData: {
      initialDurationMs: 1000 * 60 * 60 * 2, // 2 hours
      expiresAt: Date.now() + 1000 * 60 * 75, // 1h 15m remaining
      isExpired: false,
      category: 'quick-thought'
    }
  },

  {
    id: 'scratch-temporary-credentials',
    title: 'Lab Cluster Port Forwarding & Proxy Command',
    type: 'scratchpad',
    folderId: 'ideas',
    tags: ['scratchpad', 'server', 'devops'],
    isPinned: false,
    isArchived: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    updatedAt: Date.now() - 1000 * 60 * 60 * 8,
    content: `ssh -N -L 9090:localhost:9090 -J student@gateway.lab.cs.edu node04.cluster.lan
Token: temp_tok_8492021 (valid until tonight's lab maintenance)`,
    scratchpadData: {
      initialDurationMs: 1000 * 60 * 60 * 24, // 24 hours
      expiresAt: Date.now() + 1000 * 60 * 60 * 16,
      isExpired: false,
      category: 'temporary-code'
    }
  }
];
