---
title: OSI Model
description: >-
  A practical reference for the seven OSI layers and how they help diagnose
  network behavior.
date: '2026-07-02T12:54:03+08:00'
topic: Networking
topicSlug: networking
entrySlug: concepts-osi-model
source: >-
  https://raw.githubusercontent.com/adi-param/networking-wiki/main/docs/concepts/osi-model.md
sourceUrl: >-
  https://github.com/adi-param/networking-wiki/blob/main/docs/concepts/osi-model.md
---

The OSI model is a teaching and troubleshooting framework for reasoning about how data moves across a network. Real systems do not always map perfectly to one layer, but the model is still useful because it gives you a disciplined way to ask where a failure is happening.

The core question is:

> Which layer must work before the next layer can work?

When you debug from lower layers upward, you avoid chasing application symptoms before confirming that the network path exists.

## Layer 1: Physical

The physical layer covers the transmission of raw bits across a medium.

Examples include:

- Copper cables
- Fiber links
- Radio signals
- Transceivers
- Link lights
- Signal quality

Common failures include unplugged cables, damaged fiber, bad optics, weak wireless signal, or a disabled switch port.

Useful checks:

- Is the interface physically connected?
- Is the link up?
- Are there errors, drops, or flaps?
- Is the expected speed and duplex negotiated?

## Layer 2: Data Link

The data link layer moves frames across a local network segment.

Important concepts include:

- MAC addresses
- Ethernet frames
- VLANs
- Switches
- ARP
- Spanning Tree Protocol

Layer 2 answers the question: can two devices communicate on the same local network?

Common failures include VLAN mismatch, duplicate MAC addresses, blocked switch ports, ARP issues, or trunk misconfiguration.

## Layer 3: Network

The network layer moves packets between networks.

Important concepts include:

- IP addresses
- Subnets
- Routing tables
- Default gateways
- ICMP
- NAT

Layer 3 answers the question: can a packet reach the destination network?

Common failures include incorrect subnet masks, missing routes, wrong gateways, broken NAT rules, overlapping CIDR ranges, or blocked ICMP that hides useful diagnostics.

## Layer 4: Transport

The transport layer handles end-to-end communication between processes.

Important concepts include:

- TCP
- UDP
- Ports
- Connection state
- Retransmissions
- Flow control

Layer 4 answers the question: can a client reach the expected port on the destination?

Common failures include closed ports, security group blocks, firewall rules, connection resets, packet loss, or a service listening only on localhost.

## Layer 5: Session

The session layer describes how communication sessions are established, maintained, and closed.

In practical systems, this layer often shows up through:

- Authentication sessions
- RPC connections
- Database sessions
- Long-lived application connections
- Connection pooling

Common failures include expired sessions, broken connection reuse, idle timeouts, or stateful middleboxes dropping long-lived flows.

## Layer 6: Presentation

The presentation layer handles data format, encoding, compression, and encryption.

Examples include:

- TLS
- Character encoding
- JSON
- XML
- Protocol serialization
- Compression

Common failures include certificate errors, TLS version mismatch, unsupported cipher suites, invalid encoding, or a client and server disagreeing on data format.

## Layer 7: Application

The application layer is where user-facing protocols and business logic operate.

Examples include:

- HTTP
- DNS
- SMTP
- SSH
- gRPC
- Application APIs

Common failures include bad routes, invalid credentials, authorization errors, malformed requests, application bugs, dependency failures, and incorrect configuration.

## Troubleshooting With The OSI Model

A practical troubleshooting flow is:

1. Confirm the interface and link are healthy.
2. Confirm local network behavior, including VLAN and ARP.
3. Confirm IP addressing, routing, and gateway behavior.
4. Confirm the destination port is reachable.
5. Confirm session behavior, timeouts, and connection reuse.
6. Confirm TLS, encoding, and data format.
7. Confirm application behavior, logs, and dependencies.

You do not always need to walk every layer, but the order keeps the investigation grounded.

## Common Mapping

| Layer | Name | Practical examples |
| --- | --- | --- |
| 7 | Application | HTTP, DNS, SSH, APIs |
| 6 | Presentation | TLS, JSON, encoding, compression |
| 5 | Session | Auth sessions, connection pools, RPC sessions |
| 4 | Transport | TCP, UDP, ports, connection state |
| 3 | Network | IP, routing, ICMP, NAT |
| 2 | Data Link | Ethernet, MAC, VLAN, ARP |
| 1 | Physical | Cables, optics, radio, signal |

## Key Takeaway

The OSI model is not a perfect description of every modern protocol stack. Its value is operational: it gives you a repeatable mental model for separating physical, network, transport, encryption, and application problems.
