# 🛡️ CYBERTRACE AI

### Predict the Cash-Out. Stop the Loss.

> **SIH 2026 • Problem Statement: SIH26184**\
> **Predictive Cybercrime Intelligence & Cash-Out Forecasting Platform**

CYBERTRACE AI is a prototype decision-support platform designed to help
authorized cybercrime investigators analyze a reported cyber-fraud case,
trace the movement of funds through multiple transaction layers, and
forecast **where and when a potential cash-out may occur**.

Instead of stopping at a conventional cybercrime heatmap, CYBERTRACE AI
focuses on the **next cash-out event** and converts predictive
intelligence into an actionable investigation workflow.

------------------------------------------------------------------------

## 🚨 The Problem

In a cyber-fraud incident, money can move rapidly through multiple mule
accounts before being withdrawn as cash.

``` text
Victim
   │
   ▼
Mule Account 1
   │
   ▼
Mule Account 2
   │
   ▼
Mule Account 3
   │
   ▼
Potential Cash-Out
(ATM / Cash Point)
```

Once the money becomes cash, recovery becomes significantly more
difficult.

The key operational questions are:

-   📍 **WHERE** is the money likely to be withdrawn?
-   ⏱️ **WHEN** is the withdrawal likely to happen?
-   🔎 **WHY** does the system identify that location?
-   🚓 **WHAT ACTION** can an investigator consider before the cash-out?

CYBERTRACE AI is designed around these questions.

------------------------------------------------------------------------

## 💡 Our Solution

CYBERTRACE AI combines:

**Complaint Intelligence**\
↓\
**Money-Trail Analysis**\
↓\
**Spatio-Temporal Signals**\
↓\
**Cash-Out Prediction**\
↓\
**GIS Visualization**\
↓\
**Explainable Intelligence**\
↓\
**Interception Planning**\
↓\
**Alerts & Investigation Workflow**

The platform provides investigators with a unified view of the case
rather than requiring them to inspect transaction, geographic, and risk
information separately.

------------------------------------------------------------------------

## ✨ Key Features

  -----------------------------------------------------------------------
  Feature                             Description
  ----------------------------------- -----------------------------------
  🖥️ Command Dashboard                Real-time overview of cases, risk,
                                      predictions and alerts

  📁 Case Investigation               Detailed investigation view for
                                      individual complaints

  🕸️ Money Trail Graph                Visualizes movement through
                                      transaction layers and linked
                                      accounts

  🎯 Cash-Out Prediction              Generates Top-5 potential cash-out
                                      locations

  ⏱️ Time Prediction                  Estimates the expected cash-out
                                      window

  🗺️ GIS Intelligence                 Maps predicted locations, clusters
                                      and risk zones

  💡 Explainable AI                   Shows the signals contributing to a
                                      prediction

  🚓 Interception Optimizer           Helps plan deployment around
                                      predicted locations

  🔮 What-If Simulation               Simulates actions and observes
                                      changes in predicted risk

  🚨 Alert Center                     Creates actionable simulated
                                      investigation alerts

  📊 Analytics                        Tracks model and case-level
                                      analytics

  📝 Reports                          Generates structured investigation
                                      summaries

  🔐 Audit & Privacy                  Supports role-based access and
                                      masked sensitive identifiers

  📱 Field Officer Mode               Mobile-focused view for location,
                                      countdown and navigation
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 🧠 Core Intelligence

### 1. Money-Trail Intelligence

The system represents the transaction flow as a connected graph:

``` text
Complaint
   │
   ▼
Victim
   │
   ▼
Mule 1
   │
   ▼
Mule 2
   │
   ▼
Mule 3
   │
   ▼
Cash-Out Cluster
```

Each transaction can contain:

-   Amount
-   Timestamp
-   Transaction channel
-   Source account
-   Destination account
-   Transaction layer
-   Geographic information

------------------------------------------------------------------------

### 2. Cash-Out Forecasting

For a selected case, the system produces a ranked set of potential
locations.

Example:

``` text
TOP PREDICTED CASH-OUT LOCATIONS

#1  ATM Cluster 07   ████████████████  87%
#2  ATM Cluster 12   █████████████     72%
#3  ATM Cluster 04   ███████████       61%
#4  ATM Cluster 19   █████████         53%
#5  ATM Cluster 02   ████████          46%
```

The interface also presents an estimated time window and prediction
confidence based on the simulated model/data pipeline.

------------------------------------------------------------------------

### 3. Explainable Prediction

CYBERTRACE AI does not only display a risk number.

It provides supporting signals such as:

-   Transaction velocity
-   Money-trail depth
-   Geographic relationship
-   Previous activity
-   Distance from the latest known transaction
-   Time-of-day patterns
-   Historical synthetic patterns

This helps an investigator understand **why a location was surfaced**.

------------------------------------------------------------------------

## 🚓 From Prediction to Intervention

A key design goal is to move beyond:

> "This area is risky."

towards:

> "This specific case has a potential cash-out risk at these locations
> within this time window."

The interception workflow can associate predicted locations with
available patrol resources and allow investigators to explore possible
intervention scenarios.

``` text
Predicted ATM Cluster
        │
        ▼
Interception Optimizer
        │
        ├── Patrol Unit A
        ├── Patrol Unit B
        └── Patrol Unit C
        │
        ▼
Potential Intervention
```

------------------------------------------------------------------------

## 🔮 What-If Simulation

Investigators can simulate actions such as:

-   Freezing a suspicious account
-   Deploying a patrol unit
-   Changing an intervention location

The system can then visualize how the simulated action changes the
predicted risk distribution.

This is intended as a **decision-support simulation**, not an autonomous
operational command system.

------------------------------------------------------------------------

## 🗺️ GIS Intelligence

The GIS interface provides a geographic view of:

-   Predicted cash-out locations
-   ATM clusters
-   Risk zones
-   Complaint locations
-   Relevant geographic signals

Risk is visually categorized into:

🟢 Low\
🟡 Medium\
🟠 High\
🔴 Critical

The interface is designed to let an investigator move quickly from a
case to a physical location.

------------------------------------------------------------------------

## 📊 Model Validation

The project includes a synthetic validation workflow.

Example dashboard metrics may include:

-   Hit@1
-   Hit@3
-   Hit@5
-   Mean Reciprocal Rank (MRR)
-   Time prediction error
-   Median lead time

### Important

All performance figures shown in the prototype are based on
**synthetic/simulated data** and should not be interpreted as real-world
deployment performance.

The dashboard explicitly identifies simulated validation where
applicable.

------------------------------------------------------------------------

## 🧪 Data Strategy

Real NCRP, bank transaction, KYC and other sensitive financial records
are not assumed to be publicly available for this prototype.

Therefore, CYBERTRACE AI uses **synthetic/demo data** designed to
reproduce the structure of a cyber-fraud money trail.

Synthetic entities include:

``` text
Cases
Accounts
Mule Accounts
Transactions
Money-Trail Edges
ATM Locations
ATM Clusters
Cash-Out Events
Districts
Alerts
Predictions
```

No real personal banking information is required.

------------------------------------------------------------------------

## 🏗️ System Architecture

``` text
                    ┌─────────────────────┐
                    │   Cyber Complaint   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Case Intelligence  │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
        ┌─────────────────┐         ┌─────────────────┐
        │ Transaction     │         │ Geographic      │
        │ / Money Trail   │         │ Intelligence    │
        └────────┬────────┘         └────────┬────────┘
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Prediction Engine   │
                    │  WHERE + WHEN       │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
             Top-5          Time          Risk &
           Locations       Window       Explanation
                 │             │             │
                 └─────────────┼─────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ GIS + Intervention  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Alerts / Reports    │
                    └─────────────────────┘
```

------------------------------------------------------------------------

## 🖥️ Main Application Flow

``` text
Login
  ↓
Command Dashboard
  ↓
Select Case
  ↓
Money Trail
  ↓
Run Prediction
  ↓
Top-5 Locations
  ↓
GIS Map
  ↓
"Why?" Explanation
  ↓
Interception Optimizer
  ↓
What-If Simulation
  ↓
Alert
  ↓
Investigator Report
```

------------------------------------------------------------------------

## 🎬 Demo Flow

The recommended demonstration follows one complete case:

1.  🔐 Login to the investigator console
2.  📊 Open the command dashboard
3.  📁 Select a high-risk complaint
4.  🕸️ Inspect the money trail
5.  🤖 Run the cash-out prediction
6.  🎯 Review the Top-5 locations
7.  🗺️ Open the GIS map
8.  💡 Inspect the explanation
9.  🚓 Run interception optimization
10. 🔮 Test a What-If scenario
11. 🚨 Generate an alert
12. 📝 Review the final intelligence report

------------------------------------------------------------------------

## 🔐 Privacy & Responsible Use

CYBERTRACE AI is designed as a **prototype decision-support system**.

-   Uses synthetic/demo data
-   Does not require real PII
-   Does not expose real bank credentials
-   Sensitive identifiers can be masked
-   Alerts are simulated
-   Government/bank integrations are conceptual unless separately
    authorized
-   Human verification remains necessary before operational action

### ⚠️ Prototype Disclaimer

> This project is a research/prototype implementation using synthetic
> data. It does not represent access to NCRP, CFCFRMS, bank, KYC, I4C or
> other restricted government systems. Predictions and metrics
> demonstrated in the application are for prototype evaluation only.

------------------------------------------------------------------------

## 🛠️ Technology

The project is designed as a modern web-based intelligence console. The
exact runtime/deployment configuration may vary by implementation.

Typical components include:

-   React / TypeScript
-   Vite
-   Tailwind CSS
-   Interactive GIS mapping
-   Interactive charts
-   Graph visualization
-   Synthetic data pipeline
-   Prediction/analytics service
-   API-ready architecture

------------------------------------------------------------------------

## 📂 Suggested Project Structure

``` text
CYBERTRACE-AI/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── data/
│   └── ...
│
├── public/
├── README.md
├── package.json
└── ...
```

------------------------------------------------------------------------

## 🚀 Getting Started

### 1. Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd CYBERTRACE-AI
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Start the development server

``` bash
npm run dev
```

Open the local URL shown by the development server.

### 4. Build for production

``` bash
npm run build
```

> If your repository uses a different setup, update these commands to
> match the actual project configuration.

------------------------------------------------------------------------

## 🌐 Deployment

The application can be deployed using a modern frontend hosting platform
such as:

-   Vercel
-   Netlify
-   Cloudflare Pages

For production deployment, configure environment variables through the
hosting provider rather than committing secrets to GitHub.

------------------------------------------------------------------------

## 🏆 SIH Focus

CYBERTRACE AI is designed around a simple operational principle:

> ### **Don't just investigate where the fraud happened. Predict where the money may go next.**

The prototype brings together:

**Cybercrime Complaint + Money Trail + Spatio-Temporal Intelligence +
GIS + Explainability + Proactive Intervention**

into one investigator-oriented platform.

------------------------------------------------------------------------

## 📌 Project Status

**Prototype / SIH 2026**

  Module                   Status
  ------------------------ --------
  Command Dashboard        ✅
  Case Investigation       ✅
  Money Trail Graph        ✅
  Cash-Out Prediction      ✅
  Top-5 Locations          ✅
  GIS Intelligence         ✅
  Explainable AI           ✅
  Interception Optimizer   ✅
  What-If Simulation       ✅
  Alert Workflow           ✅
  Analytics                ✅
  Reports                  ✅
  Synthetic Data           ✅

------------------------------------------------------------------------

## 📜 Disclaimer

This repository is intended for educational, research and hackathon
demonstration purposes.

All displayed cases, accounts, transactions, locations, predictions and
performance metrics should be treated as **synthetic/demo information**
unless explicitly stated otherwise.

The system must not be used as the sole basis for real-world enforcement
or financial action.

------------------------------------------------------------------------

### ⭐ If you find this project useful, consider starring the repository.

**CYBERTRACE AI**\
*Predict the Cash-Out. Stop the Loss.*
