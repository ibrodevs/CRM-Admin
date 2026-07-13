<div align="center">

# Travel Hub CRM

### Role-based operations workspace for travel agencies

[![Demo](https://img.shields.io/badge/Interactive_Demo-Open-2563EB?style=for-the-badge)](https://crm-admin-theta.vercel.app)
![React](https://img.shields.io/badge/React-JSX-61DAFB?style=flat-square&logo=react&logoColor=111827)
![Status](https://img.shields.io/badge/status-product_prototype-F59E0B?style=flat-square)

</div>

## Overview

Travel Hub CRM is an interactive product prototype for managing the operational lifecycle of a travel order. It brings sales, booking services, passengers, suppliers, finance, documents, notifications, and team communication into one role-aware workspace.

The repository focuses on product flows and interface behavior. It uses realistic demo data so stakeholders can validate navigation, information hierarchy, and operational scenarios before backend integration.

## Core modules

- Role-specific manager dashboard and KPI views
- Orders with status chain, passenger details, services, and activity context
- Air, rail, hotel, transfer, bus, and tour service workflows
- Clients, companies, suppliers, and commercial offers
- Finance operations, payments, debt, commissions, and returns
- Document center, receipts, and fulfillment workflow
- Route-receipt import and reconciliation experience
- Global notifications center
- Contextual team chat and order-linked discussions
- Role-based access and protected sections
- Responsive drawers, tables, filters, and action menus

## Product architecture

The prototype is split into focused page and system modules instead of one monolithic file:

~~~text
index.html                  # application shell, tokens, and global styles
js/app.jsx                  # authentication, routing, roles, shared state
js/page_*.jsx               # domain pages and workflows
js/components*.jsx          # shared UI building blocks
js/data*.js                 # realistic demonstration data
~~~

## Technology

| Area | Technology |
|---|---|
| Interface | React and JSX |
| Styling | Custom responsive CSS and reusable design tokens |
| State | React state with shared in-memory demo data |
| Product model | Role-aware routes and domain-specific modules |
| Delivery | Static deployment suitable for rapid stakeholder review |

## Running locally

No application secrets or backend services are required for the prototype.

~~~bash
python3 -m http.server 8000
~~~

Open http://localhost:8000.

## Demo scope

This repository is a high-fidelity frontend prototype. The following are simulated for product validation:

- Authentication
- Service search results
- Document processing
- Payments and finance actions
- Notifications and chat data
- Role switching

A production implementation would connect the existing flows to authenticated APIs, persistent storage, provider integrations, audit logging, and organization-level access control.

## Product goal

The CRM is designed to reduce context switching between messengers, spreadsheets, reservation tools, documents, and financial records. Its main principle is to keep every operational action connected to the correct order and customer.

