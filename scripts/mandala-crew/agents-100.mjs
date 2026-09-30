/**
 * Canonical 100-agent Mandala/LineageStudio pre-ESFR roster (Vision→Stewardship).
 * Foreman and ESFR are defined separately and do NOT occupy these 100 slots.
 * Descriptions are the exact one-line role briefs (canonical).
 */

/** @type {Array<{id:string,name:string,orderStart:number,orderEnd:number,roleSkill:string,family:string}>} */
export const PHASES = [
  { id: 'vision', name: 'Vision & Discovery', orderStart: 1, orderEnd: 10, roleSkill: 'ls-architect', family: 'vision' },
  { id: 'architecture', name: 'Architecture & Specification', orderStart: 11, orderEnd: 25, roleSkill: 'ls-architect', family: 'architecture' },
  { id: 'design', name: 'Design & UX', orderStart: 26, orderEnd: 35, roleSkill: 'ls-builder', family: 'design' },
  { id: 'implementation', name: 'Implementation & Coding', orderStart: 36, orderEnd: 55, roleSkill: 'ls-coding', family: 'implementation' },
  { id: 'testing', name: 'Testing & Verification', orderStart: 56, orderEnd: 75, roleSkill: 'ls-inspector', family: 'testing' },
  { id: 'operations', name: 'Deployment, Operations & Evolution', orderStart: 76, orderEnd: 100, roleSkill: 'ls-implementor', family: 'operations' },
];

/** @type {Array<{name:string,id:string,description:string,vendorBuckets:string[],writes:boolean}>} */
const ROSTER = [
  // 1–10 Vision, Problem, and Intent
  { name: 'Problem Discovery Agent', id: 'ls-problem-discovery', description: 'Finds real-world problems worth solving.', vendorBuckets: ['plan', 'bootstrap', 'brainstorming'], writes: false },
  { name: 'Stakeholder Mapping Agent', id: 'ls-stakeholder-mapping', description: 'Identifies who is affected and who decides.', vendorBuckets: ['plan', 'workflow-from-chats'], writes: false },
  { name: 'Domain Analysis Agent', id: 'ls-domain-analysis', description: 'Builds a conceptual map of the problem space.', vendorBuckets: ['architect', 'architecture-analyze'], writes: false },
  { name: 'User Research Agent', id: 'ls-user-research', description: 'Gathers qualitative and quantitative user evidence.', vendorBuckets: ['plan', 'what-did-i-get-done'], writes: false },
  { name: 'Persona Synthesis Agent', id: 'ls-persona-synthesis', description: 'Turns raw user data into governed personas.', vendorBuckets: ['plan', 'bootstrap'], writes: false },
  { name: 'Journey Mapping Agent', id: 'ls-journey-mapping', description: 'Models user flows and pain points.', vendorBuckets: ['plan', 'figma-use'], writes: false },
  { name: 'Value Proposition Agent', id: 'ls-value-proposition', description: 'Articulates why this software should exist.', vendorBuckets: ['plan', 'bootstrap'], writes: false },
  { name: 'Requirements Elicitation Agent', id: 'ls-requirements-elicitation', description: 'Captures functional and non-functional needs.', vendorBuckets: ['plan', 'architect', 'bootstrap'], writes: false },
  { name: 'Risk Identification Agent', id: 'ls-risk-identification', description: 'Surfaces technical, legal, and social risks.', vendorBuckets: ['plan', 'audit-report', 'verification'], writes: false },
  { name: 'Feasibility Assessment Agent', id: 'ls-feasibility-assessment', description: 'Evaluates whether the system is buildable and sustainable.', vendorBuckets: ['plan', 'architect', 'verify-this'], writes: false },

  // 11–25 Architecture, Contracts, and Governance
  { name: 'System Architecture Agent', id: 'ls-system-architecture', description: 'Designs the overall structure and boundaries.', vendorBuckets: ['architect', 'architecture-analyze', 'aws-architecture-diagram'], writes: false },
  { name: 'Domain Modeling Agent', id: 'ls-domain-modeling', description: 'Creates entities, aggregates, and bounded contexts.', vendorBuckets: ['architect', 'modularist'], writes: false },
  { name: 'API Contract Design Agent', id: 'ls-api-contract-design', description: 'Defines external and internal service contracts.', vendorBuckets: ['architect', 'vercel-functions', 'netlify-functions'], writes: false },
  { name: 'Data Modeling Agent', id: 'ls-data-modeling', description: 'Designs schemas, relationships, and storage strategies.', vendorBuckets: ['database', 'netlify-database', 'architect'], writes: false },
  { name: 'Security Architecture Agent', id: 'ls-security-architecture', description: 'Embeds security principles into the design.', vendorBuckets: ['auth', 'dv-security', 'clerk-setup', 'azure-compliance'], writes: false },
  { name: 'Performance Modeling Agent', id: 'ls-performance-modeling', description: 'Predicts load, latency, and throughput.', vendorBuckets: ['architect', 'optimize', 'next-cache-components'], writes: false },
  { name: 'Scalability Planning Agent', id: 'ls-scalability-planning', description: 'Plans horizontal/vertical scaling strategies.', vendorBuckets: ['architect', 'azure-enterprise-infra-planner', 'deploy'], writes: false },
  { name: 'Resilience & Fault‑Tolerance Agent', id: 'ls-resilience-fault-tolerance', description: 'Designs for failure and recovery.', vendorBuckets: ['architect', 'verification', 'workflow'], writes: false },
  { name: 'Compliance & Regulatory Agent', id: 'ls-compliance-regulatory', description: 'Aligns architecture with legal constraints.', vendorBuckets: ['azure-compliance', 'audit-report', 'verification'], writes: false },
  { name: 'Interface Specification Agent', id: 'ls-interface-specification', description: 'Defines UI, CLI, and integration interfaces.', vendorBuckets: ['architect', 'bootstrap', 'protocol'], writes: false },
  { name: 'Integration Topology Agent', id: 'ls-integration-topology', description: 'Maps services, queues, and external systems.', vendorBuckets: ['architect', 'workflow', 'deploy'], writes: false },
  { name: 'Configuration Design Agent', id: 'ls-configuration-design', description: 'Plans configuration surfaces and defaults.', vendorBuckets: ['env-vars', 'bootstrap', 'architect'], writes: false },
  { name: 'Logging & Observability Design Agent', id: 'ls-logging-observability-design', description: 'Specifies metrics, traces, and logs.', vendorBuckets: ['cx-setup', 'sentry-instrument', 'analyze-dashboard'], writes: false },
  { name: 'Deployment Topology Agent', id: 'ls-deployment-topology', description: 'Designs environments, clusters, and regions.', vendorBuckets: ['deploy', 'deployments-cicd', 'render-deploy', 'netlify-deploy'], writes: false },
  { name: 'Cost & Resource Modeling Agent', id: 'ls-cost-resource-modeling', description: 'Models compute, storage, and financial cost.', vendorBuckets: ['architect', 'env-vars', 'deploy'], writes: false },

  // 26–35 UX, Interaction, and Experience
  { name: 'Information Architecture Agent', id: 'ls-information-architecture', description: 'Structures content and navigation.', vendorBuckets: ['figma-use', 'plan', 'bootstrap'], writes: false },
  { name: 'Interaction Design Agent', id: 'ls-interaction-design', description: 'Designs flows, states, and transitions.', vendorBuckets: ['figma-design-to-code', 'react-best-practices'], writes: false },
  { name: 'Visual Design Agent', id: 'ls-visual-design', description: 'Defines visual language and component styles.', vendorBuckets: ['figma-use', 'shadcn', 'figma-generate-design'], writes: false },
  { name: 'Accessibility Design Agent', id: 'ls-accessibility-design', description: 'Ensures inclusive, accessible interfaces.', vendorBuckets: ['react-best-practices', 'improve-react', 'verify-this'], writes: false },
  { name: 'Design System Agent', id: 'ls-design-system', description: 'Maintains reusable UI components and patterns.', vendorBuckets: ['shadcn', 'figma-use', 'react-best-practices'], writes: true },
  { name: 'Prototype Creation Agent', id: 'ls-prototype-creation', description: 'Builds interactive prototypes for validation.', vendorBuckets: ['figma-design-to-code', 'bootstrap', 'shadcn'], writes: true },
  { name: 'Usability Testing Agent', id: 'ls-usability-testing', description: 'Tests UX with real or simulated users.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'plan'], writes: false },
  { name: 'Content Strategy Agent', id: 'ls-content-strategy', description: 'Governs text, tone, and messaging.', vendorBuckets: ['ce-doc-review', 'workflow-from-chats'], writes: true },
  { name: 'Localization & Internationalization Agent', id: 'ls-localization-internationalization', description: 'Prepares for multiple languages and regions.', vendorBuckets: ['nextjs', 'react-best-practices', 'bootstrap'], writes: true },
  { name: 'Design Governance Agent', id: 'ls-design-governance', description: 'Ensures design decisions remain coherent and documented.', vendorBuckets: ['figma-use', 'ce-doc-review', 'review-and-ship'], writes: false },

  // 36–55 Implementation, Coding, and Internal Quality
  { name: 'Backend Implementation Agent', id: 'ls-backend-implementation', description: 'Writes and maintains server-side logic.', vendorBuckets: ['vercel-functions', 'netlify-functions', 'database', 'auth'], writes: true },
  { name: 'Frontend Implementation Agent', id: 'ls-frontend-implementation', description: 'Builds client-side applications.', vendorBuckets: ['react-best-practices', 'nextjs', 'shadcn', 'improve-react'], writes: true },
  { name: 'Mobile Implementation Agent', id: 'ls-mobile-implementation', description: 'Creates native or hybrid mobile apps.', vendorBuckets: ['react-best-practices', 'clerk-expo-patterns', 'bootstrap'], writes: true },
  { name: 'Database Implementation Agent', id: 'ls-database-implementation', description: 'Implements schemas, queries, and migrations.', vendorBuckets: ['database', 'netlify-database', 'vercel-storage', 'create-database-row'], writes: true },
  { name: 'Infrastructure‑as‑Code Agent', id: 'ls-infrastructure-as-code', description: 'Codifies infrastructure in declarative form.', vendorBuckets: ['deploy', 'render-deploy', 'azure-enterprise-infra-planner', 'deployments-cicd'], writes: true },
  { name: 'Configuration Management Agent', id: 'ls-configuration-management', description: 'Manages environment and app configs.', vendorBuckets: ['env-vars', 'bootstrap', 'deploy'], writes: true },
  { name: 'Code Quality Agent', id: 'ls-code-quality', description: 'Enforces style, patterns, and cleanliness.', vendorBuckets: ['thermo-nuclear-code-quality-review', 'react-doctor', 'improve-react'], writes: false },
  { name: 'Static Analysis Agent', id: 'ls-static-analysis', description: 'Runs static checks for bugs and vulnerabilities.', vendorBuckets: ['verify-this', 'check-agent-compatibility', 'audit-dependencies'], writes: false },
  { name: 'Secure Coding Agent', id: 'ls-secure-coding', description: 'Applies secure coding practices and patterns.', vendorBuckets: ['dv-security', 'auth', 'chainguard-setup-auth', 'clerk-setup'], writes: true },
  { name: 'Performance Optimization Agent', id: 'ls-performance-optimization', description: 'Tunes hot paths and resource usage.', vendorBuckets: ['next-cache-components', 'turbopack', 'react-best-practices', 'optimize'], writes: true },
  { name: 'Refactoring Agent', id: 'ls-refactoring', description: 'Improves structure without changing behavior.', vendorBuckets: ['improve-react', 'react-doctor', 'modularist'], writes: true },
  { name: 'Dependency Management Agent', id: 'ls-dependency-management', description: 'Curates and updates third‑party libraries.', vendorBuckets: ['audit-dependencies', 'chainguard-setup-auth', 'verify-this'], writes: true },
  { name: 'Build Pipeline Agent', id: 'ls-build-pipeline', description: 'Maintains CI/CD build processes.', vendorBuckets: ['deployments-cicd', 'vercel-cli', 'cli-for-agents', 'verify-this'], writes: true },
  { name: 'Feature Flag Agent', id: 'ls-feature-flag', description: 'Implements and manages feature toggles.', vendorBuckets: ['workflow', 'env-vars', 'bootstrap'], writes: true },
  { name: 'API Client/SDK Agent', id: 'ls-api-client-sdk', description: 'Generates and maintains client libraries.', vendorBuckets: ['ai-sdk', 'sdk', 'typescript'], writes: true },
  { name: 'CLI/Tooling Agent', id: 'ls-cli-tooling', description: 'Builds developer and operator tools.', vendorBuckets: ['cli-for-agents', 'vercel-cli', 'bootstrap'], writes: true },
  { name: 'Documentation‑in‑Code Agent', id: 'ls-documentation-in-code', description: 'Maintains inline docs and comments.', vendorBuckets: ['ce-doc-review', 'workflow-from-chats'], writes: true },
  { name: 'Test Harness Implementation Agent', id: 'ls-test-harness-implementation', description: 'Builds frameworks for automated tests.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'clerk-testing'], writes: true },
  { name: 'Mock & Stub Generation Agent', id: 'ls-mock-stub-generation', description: 'Creates test doubles for isolation.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'bootstrap'], writes: true },
  { name: 'Code Review Assistant Agent', id: 'ls-code-review-assistant', description: 'Supports human review with automated insights.', vendorBuckets: ['code-review', 'ce-code-review', 'review-and-ship'], writes: false },

  // 56–75 Testing, Verification, and Proof
  { name: 'Unit Testing Agent', id: 'ls-unit-testing', description: 'Ensures individual units behave correctly.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'clerk-testing'], writes: true },
  { name: 'Integration Testing Agent', id: 'ls-integration-testing', description: 'Validates interactions between components.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'workflow'], writes: true },
  { name: 'System Testing Agent', id: 'ls-system-testing', description: 'Tests the full system in realistic conditions.', vendorBuckets: ['run-smoke-tests', 'verification', 'verify-this'], writes: true },
  { name: 'End‑to‑End Testing Agent', id: 'ls-end-to-end-testing', description: 'Simulates real user workflows.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'cli-for-agents'], writes: true },
  { name: 'Regression Testing Agent', id: 'ls-regression-testing', description: 'Guards against reintroduced bugs.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'deployments-cicd'], writes: true },
  { name: 'Performance & Load Testing Agent', id: 'ls-performance-load-testing', description: 'Tests under stress and scale.', vendorBuckets: ['verify-this', 'optimize', 'analyze-dashboard'], writes: true },
  { name: 'Security & Penetration Testing Agent', id: 'ls-security-penetration-testing', description: 'Probes for vulnerabilities.', vendorBuckets: ['dv-security', 'audit-dependencies', 'chainguard-setup-auth'], writes: false },
  { name: 'Compliance Testing Agent', id: 'ls-compliance-testing', description: 'Verifies regulatory and policy adherence.', vendorBuckets: ['azure-compliance', 'audit-report', 'verify-this'], writes: false },
  { name: 'Cross‑Browser Testing Agent', id: 'ls-cross-browser-testing', description: 'Ensures web compatibility.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'react-best-practices'], writes: true },
  { name: 'Cross‑Device Testing Agent', id: 'ls-cross-device-testing', description: 'Ensures behavior across devices.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'clerk-expo-patterns'], writes: true },
  { name: 'Chaos Testing Agent', id: 'ls-chaos-testing', description: 'Injects failures to test resilience.', vendorBuckets: ['verification', 'workflow', 'verify-this'], writes: true },
  { name: 'Resilience Testing Agent', id: 'ls-resilience-testing', description: 'Validates recovery and redundancy.', vendorBuckets: ['verification', 'run-smoke-tests', 'verify-this'], writes: true },
  { name: 'Data Migration Testing Agent', id: 'ls-data-migration-testing', description: 'Tests schema and data evolution.', vendorBuckets: ['database', 'verify-this', 'run-smoke-tests'], writes: true },
  { name: 'Backup & Restore Testing Agent', id: 'ls-backup-restore-testing', description: 'Ensures data safety and recovery.', vendorBuckets: ['database', 'verification', 'verify-this'], writes: true },
  { name: 'Failover Testing Agent', id: 'ls-failover-testing', description: 'Validates high‑availability mechanisms.', vendorBuckets: ['verification', 'deploy', 'verify-this'], writes: true },
  { name: 'User Acceptance Testing Agent', id: 'ls-user-acceptance-testing', description: 'Coordinates UAT scenarios and feedback.', vendorBuckets: ['run-smoke-tests', 'verify-this', 'review-and-ship'], writes: false },
  { name: 'Test Data Management Agent', id: 'ls-test-data-management', description: 'Curates realistic, safe test data.', vendorBuckets: ['database', 'create-database-row', 'run-smoke-tests'], writes: true },
  { name: 'Test Coverage Analysis Agent', id: 'ls-test-coverage-analysis', description: 'Measures and improves coverage.', vendorBuckets: ['verify-this', 'run-smoke-tests', 'check-agent-compatibility'], writes: false },
  { name: 'Defect Triage Agent', id: 'ls-defect-triage', description: 'Prioritizes and routes issues.', vendorBuckets: ['sentry-debug-issue', 'review-and-ship', 'verify-this'], writes: false },
  { name: 'Release Readiness Verification Agent', id: 'ls-release-readiness-verification', description: 'Certifies that a release is safe.', vendorBuckets: ['review-and-ship', 'verify-this', 'run-smoke-tests'], writes: false },

  // 76–100 Deployment, Operations, Feedback, and Stewardship
  { name: 'Release Orchestration Agent', id: 'ls-release-orchestration', description: 'Plans and executes releases.', vendorBuckets: ['deployments-cicd', 'deploy', 'review-and-ship'], writes: true },
  { name: 'Canary & Blue‑Green Deployment Agent', id: 'ls-canary-blue-green-deployment', description: 'Manages progressive rollouts.', vendorBuckets: ['deploy', 'deployments-cicd', 'render-deploy'], writes: true },
  { name: 'Rollback Strategy Agent', id: 'ls-rollback-strategy', description: 'Designs and executes safe rollbacks.', vendorBuckets: ['deploy', 'deployments-cicd', 'verification'], writes: true },
  { name: 'Monitoring & Alerting Agent', id: 'ls-monitoring-alerting', description: 'Watches health and raises alarms.', vendorBuckets: ['cx-setup', 'cx-config', 'sentry-instrument', 'analyze-dashboard'], writes: true },
  { name: 'Incident Response Agent', id: 'ls-incident-response', description: 'Coordinates response to outages and incidents.', vendorBuckets: ['sentry-debug-issue', 'cx-setup', 'systematic-debugging'], writes: false },
  { name: 'On‑Call Coordination Agent', id: 'ls-on-call-coordination', description: 'Manages rotations and escalation paths.', vendorBuckets: ['workflow-from-chats', 'sentry-debug-issue'], writes: false },
  { name: 'Capacity Planning Agent', id: 'ls-capacity-planning', description: 'Forecasts and plans resource needs.', vendorBuckets: ['analyze-dashboard', 'architect', 'deploy'], writes: false },
  { name: 'Cost Optimization Agent', id: 'ls-cost-optimization', description: 'Reduces waste and improves efficiency.', vendorBuckets: ['env-vars', 'deploy', 'analyze-dashboard'], writes: true },
  { name: 'SLO/SLA Governance Agent', id: 'ls-slo-sla-governance', description: 'Defines and tracks reliability targets.', vendorBuckets: ['analyze-dashboard', 'cx-config', 'verification'], writes: false },
  { name: 'Security Operations Agent', id: 'ls-security-operations', description: 'Handles ongoing security posture.', vendorBuckets: ['dv-security', 'chainguard-setup-auth', 'audit-dependencies'], writes: true },
  { name: 'Patch & Upgrade Agent', id: 'ls-patch-upgrade', description: 'Manages updates and maintenance.', vendorBuckets: ['audit-dependencies', 'deployments-cicd', 'verify-this'], writes: true },
  { name: 'Feature Lifecycle Management Agent', id: 'ls-feature-lifecycle-management', description: 'Tracks features from launch to retirement.', vendorBuckets: ['workflow', 'review-and-ship', 'env-vars'], writes: true },
  { name: 'Telemetry & Analytics Agent', id: 'ls-telemetry-analytics', description: 'Collects and interprets usage data.', vendorBuckets: ['cx-setup', 'sentry-instrument', 'analyze-dashboard'], writes: true },
  { name: 'User Feedback Aggregation Agent', id: 'ls-user-feedback-aggregation', description: 'Gathers and structures feedback.', vendorBuckets: ['workflow-from-chats', 'what-did-i-get-done', 'plan'], writes: false },
  { name: 'Product Iteration Planning Agent', id: 'ls-product-iteration-planning', description: 'Turns insights into roadmap changes.', vendorBuckets: ['plan', 'writing-plans', 'workflow-from-chats'], writes: false },
  { name: 'Technical Debt Tracking Agent', id: 'ls-technical-debt-tracking', description: 'Logs and prioritizes structural issues.', vendorBuckets: ['thermo-nuclear-code-quality-review', 'review-and-ship', 'plan'], writes: false },
  { name: 'Architecture Evolution Agent', id: 'ls-architecture-evolution', description: 'Guides long‑term structural change.', vendorBuckets: ['architect', 'architecture-analyze', 'modularist'], writes: false },
  { name: 'Data Governance Agent', id: 'ls-data-governance', description: 'Oversees data quality, lineage, and access.', vendorBuckets: ['database', 'azure-compliance', 'audit-report'], writes: false },
  { name: 'Privacy & Ethics Agent', id: 'ls-privacy-ethics', description: 'Evaluates impact on users and society.', vendorBuckets: ['azure-compliance', 'auth', 'audit-report'], writes: false },
  { name: 'Compliance Audit Agent', id: 'ls-compliance-audit', description: 'Prepares and supports audits.', vendorBuckets: ['azure-compliance', 'audit-report', 'verification'], writes: false },
  { name: 'Knowledge Base & Documentation Agent', id: 'ls-knowledge-base-documentation', description: 'Maintains living documentation.', vendorBuckets: ['ce-doc-review', 'workflow-from-chats', 'writing-skills'], writes: true },
  { name: 'Developer Experience Agent', id: 'ls-developer-experience', description: 'Improves tools, workflows, and ergonomics.', vendorBuckets: ['cli-for-agents', 'bootstrap', 'verify-this'], writes: true },
  { name: 'Community & Ecosystem Agent', id: 'ls-community-ecosystem', description: 'Engages users, contributors, and partners.', vendorBuckets: ['workflow-from-chats', 'ce-doc-review', 'review-and-ship'], writes: true },
  { name: 'Sunset & Decommissioning Agent', id: 'ls-sunset-decommissioning', description: 'Retires systems safely and cleanly.', vendorBuckets: ['deploy', 'review-and-ship', 'verification'], writes: true },
  { name: 'Long‑Term Stewardship Agent', id: 'ls-long-term-stewardship', description: 'Holds responsibility for the system’s legacy.', vendorBuckets: ['weekly-review', 'review-and-ship', 'verification', 'plan'], writes: false },
];

function phaseForOrder(order) {
  return PHASES.find((p) => order >= p.orderStart && order <= p.orderEnd);
}

export function buildAgents100() {
  if (ROSTER.length !== 100) throw new Error(`Expected 100 roster entries, got ${ROSTER.length}`);
  return ROSTER.map((entry, index) => {
    const pipelineOrder = index + 1;
    const phase = phaseForOrder(pipelineOrder);
    if (!phase) throw new Error(`No phase for order ${pipelineOrder}`);
    return {
      id: entry.id,
      name: entry.name,
      phase: phase.id,
      phaseName: phase.name,
      family: phase.family,
      source: `lineage-100/${phase.id}`,
      description: entry.description,
      vendorBuckets: entry.vendorBuckets,
      writes: entry.writes,
      pipelineOrder,
      roleSkill: phase.roleSkill,
    };
  });
}

export const FOREMAN = {
  id: 'ls-crew-foreman',
  name: 'Crew Foreman',
  family: 'orchestration',
  phase: 'orchestration',
  source: 'cecp+mrs-crew',
  description:
    'Orchestrates the 100 pre-ESFR agents by phase; selects ModeKeys; hands off to ESFR (#101). Not one of the 100.',
  vendorBuckets: ['orchestrate', 'workflow-from-chats', 'review-and-ship', 'verify-this', 'writing-plans'],
  writes: false,
  pipelineOrder: 0,
  roleSkill: 'ls-crew',
  outsideRoster: true,
};

export const ESFR = {
  id: 'ls-esfr',
  name: 'ESFR Engineer Standards',
  family: 'esfr',
  phase: 'esfr',
  source: 'cecp+mrs-engineer-standards',
  description: 'Final ship gate after the 100 pre-ESFR agents. Pipeline #101. Not counted in the 100.',
  vendorBuckets: ['review-and-ship', 'verify-this', 'thermo-nuclear-code-quality-review', 'weekly-review'],
  writes: false,
  pipelineOrder: 101,
  roleSkill: 'ls-esfr',
};
