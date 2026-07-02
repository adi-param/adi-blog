---
title: STRIDE Threat Modeling
description: >-
  A structured reference for using STRIDE to identify spoofing, tampering,
  repudiation, information disclosure, denial of service, and elevation of
  privilege risks.
date: '2026-07-02T12:54:03+08:00'
topic: Threat Modeling
topicSlug: threat-modeling
entrySlug: stride
source: >-
  https://raw.githubusercontent.com/adi-param/threat-modeling-playbook/main/docs/stride.md
sourceUrl: 'https://github.com/adi-param/threat-modeling-playbook/blob/main/docs/stride.md'
---

STRIDE is a threat modeling framework that helps teams reason about what can go wrong in a system. It works by grouping threats into six categories:

- Spoofing
- Tampering
- Repudiation
- Information disclosure
- Denial of service
- Elevation of privilege

The goal is not to produce a perfect list of every possible attack. The goal is to make security thinking systematic enough that important failure modes are not missed.

## When To Use STRIDE

STRIDE is useful when you need to review:

- A new application design
- A production architecture change
- A sensitive data flow
- An authentication or authorization boundary
- A public API
- A service-to-service integration
- A cloud or Kubernetes deployment pattern

It is especially useful when paired with a data flow diagram because each trust boundary, process, data store, and external actor can be reviewed against the six categories.

## Spoofing

Spoofing is pretending to be someone or something else.

Questions to ask:

- Can an attacker impersonate a user?
- Can a service impersonate another service?
- Can a client forge identity claims?
- Can DNS, headers, tokens, or certificates be spoofed?

Common controls include:

- Strong authentication
- Mutual TLS where appropriate
- Signed tokens
- Short token lifetimes
- Workload identity
- Protection against credential theft

## Tampering

Tampering is unauthorized modification of data, code, configuration, or messages.

Questions to ask:

- Can a request be modified in transit?
- Can stored data be changed without detection?
- Can configuration be altered by the wrong principal?
- Can build artifacts or dependencies be replaced?

Common controls include:

- Integrity checks
- Digital signatures
- TLS
- Access control
- Immutable infrastructure patterns
- Change logging
- Deployment approval workflows

## Repudiation

Repudiation is the ability to deny an action because the system lacks trustworthy evidence.

Questions to ask:

- Can a user deny making a sensitive change?
- Are administrative actions logged?
- Are logs protected from modification?
- Can activity be tied to a real identity?

Common controls include:

- Audit logs
- Centralized logging
- Log integrity protection
- Time synchronization
- Strong identity for privileged actions
- Clear retention policies

## Information Disclosure

Information disclosure is exposing data to someone who should not see it.

Questions to ask:

- Can sensitive data leak through logs?
- Can APIs return data across tenant boundaries?
- Can backups, object storage, or caches expose data?
- Can error messages reveal secrets or internals?

Common controls include:

- Authorization checks
- Encryption in transit and at rest
- Data classification
- Least privilege
- Secret management
- Output filtering
- Tenant isolation tests

## Denial Of Service

Denial of service is making a system unavailable or unreliable.

Questions to ask:

- Can an attacker exhaust CPU, memory, storage, or connections?
- Can one tenant impact another tenant?
- Can expensive operations be triggered cheaply?
- Are dependencies protected from overload?

Common controls include:

- Rate limiting
- Quotas
- Circuit breakers
- Timeouts
- Backpressure
- Autoscaling
- Resource limits
- Abuse monitoring

## Elevation Of Privilege

Elevation of privilege is gaining permissions beyond what should be allowed.

Questions to ask:

- Can a normal user become an administrator?
- Can a service account access more than it needs?
- Can a container escape its intended boundary?
- Can a broken authorization check expose privileged behavior?

Common controls include:

- Least privilege
- Role-based access control
- Permission boundaries
- Defense in depth
- Secure defaults
- Privilege separation
- Regular access review

## STRIDE By System Element

STRIDE is easier to apply when you review each system element.

| Element | Useful STRIDE focus |
| --- | --- |
| External actor | Spoofing, repudiation |
| Process | Tampering, elevation of privilege, denial of service |
| Data store | Tampering, information disclosure, repudiation |
| Data flow | Tampering, information disclosure, denial of service |
| Trust boundary | Spoofing, elevation of privilege, information disclosure |

## Practical Workflow

1. Draw the data flow.
2. Identify external actors, processes, data stores, and trust boundaries.
3. Walk each element through STRIDE.
4. Write threats as concrete statements.
5. Map each meaningful threat to a control, decision, or accepted risk.
6. Revisit the model when architecture or assumptions change.

## Example Threat Statement

A useful threat statement is specific:

> An attacker with network access could tamper with unsigned webhook payloads and trigger unauthorized state changes.

That statement identifies the actor, the weakness, the affected flow, and the impact. It is easier to review than a vague item like "webhook security."

## Key Takeaway

STRIDE gives structure to security review. It helps teams move from general concern to specific threats, then from specific threats to concrete controls or explicit risk decisions.
