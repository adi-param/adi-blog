---
title: PASTA Threat Modeling
description: >-
  A structured reference for the Process for Attack Simulation and Threat
  Analysis methodology.
date: '2026-07-02T12:54:03+08:00'
topic: Threat Modeling
topicSlug: threat-modeling
entrySlug: pasta
source: >-
  https://raw.githubusercontent.com/adi-param/threat-modeling-playbook/main/docs/pasta.md
sourceUrl: 'https://github.com/adi-param/threat-modeling-playbook/blob/main/docs/pasta.md'
---

PASTA stands for Process for Attack Simulation and Threat Analysis. It is a risk-centric threat modeling methodology that connects business objectives, technical architecture, attacker behavior, and control decisions.

Unlike lightweight checklist approaches, PASTA is designed to help teams reason about realistic attack paths and business impact. It is useful when a system is important enough that the team needs a deeper analysis than a quick design review.

## When To Use PASTA

PASTA is useful for:

- High-value applications
- Internet-facing platforms
- Regulated systems
- Sensitive data flows
- Major architecture changes
- Systems with complex trust boundaries
- Products where business impact needs to drive security priorities

It can be too heavy for small changes, but it is valuable when risk context matters as much as technical weakness.

## The Seven Stages

PASTA is usually described as seven stages.

## Stage 1: Define Objectives

Start by identifying business and security objectives.

Questions to ask:

- What does this system do for the business?
- What data or capability is most important?
- What outcomes must be prevented?
- What regulations, policies, or customer commitments apply?

This stage prevents the model from becoming a generic vulnerability list. The point is to connect threats to meaningful impact.

## Stage 2: Define Technical Scope

Identify the technical boundaries of the system.

Useful inputs include:

- Architecture diagrams
- Data flow diagrams
- Asset inventory
- APIs and integrations
- Cloud accounts and network boundaries
- Identity providers
- Data stores

The output should make it clear what is in scope, what is out of scope, and where trust boundaries exist.

## Stage 3: Decompose The Application

Break the system into components and flows.

Focus on:

- Entry points
- Data flows
- Authentication paths
- Authorization decisions
- Privileged operations
- Data stores
- External dependencies

This stage gives the team enough technical detail to reason about how attacks could actually work.

## Stage 4: Analyze Threats

Identify likely threat agents and threat scenarios.

Questions to ask:

- Who would attack this system?
- What access might they already have?
- What are they trying to achieve?
- Which entry points are exposed?
- Which controls would they need to bypass?

Threats should be realistic enough to support decision-making. A useful threat scenario includes an actor, a target, a technique, and a potential impact.

## Stage 5: Analyze Vulnerabilities

Map threat scenarios to weaknesses in the system.

Examples include:

- Missing authorization checks
- Weak session handling
- Insecure object storage
- Over-permissioned service accounts
- Missing rate limits
- Weak tenant isolation
- Incomplete audit logging

The goal is not only to find known vulnerabilities. It is also to identify design weaknesses that could enable the threat scenarios.

## Stage 6: Model Attacks

Simulate attack paths through the system.

This can include:

- Attack trees
- Kill chains
- Abuse cases
- Step-by-step attacker workflows
- Control bypass analysis

Attack modeling helps teams understand which weaknesses combine into meaningful risk. A single low-severity issue may become important when chained with other conditions.

## Stage 7: Analyze Risk And Impact

Prioritize threats based on likelihood, impact, and control effectiveness.

Outputs may include:

- Risk ratings
- Recommended controls
- Accepted risks
- Architecture changes
- Detection requirements
- Follow-up validation work

This stage turns analysis into decisions.

## PASTA Compared With STRIDE

STRIDE is category-driven. It helps teams ask what can go wrong across spoofing, tampering, repudiation, information disclosure, denial of service, and elevation of privilege.

PASTA is risk-driven. It starts with objectives and works toward realistic attack simulation and business impact.

| Method | Strength |
| --- | --- |
| STRIDE | Fast, structured coverage of common threat categories |
| PASTA | Deeper risk analysis tied to attacker behavior and business impact |

Many teams can use both: STRIDE for broad coverage and PASTA for deeper analysis of critical systems.

## Practical Output

A good PASTA exercise should produce:

- A scoped system model
- Key assets and trust boundaries
- Threat scenarios
- Attack paths
- Relevant weaknesses
- Risk-ranked findings
- Recommended controls
- Open assumptions

The final output should be useful to engineering, security, product, and leadership.

## Key Takeaway

PASTA is most useful when the team needs to understand realistic attacks and business impact, not just enumerate technical weaknesses. It is heavier than STRIDE, but it gives stronger context for high-value systems.
