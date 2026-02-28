# Apollo — Exact filters (based on APOLLO_WHY_THESE_FILTERS.md)

Use these exact values in Apollo so you only get contacts who already care about outbound calling. Location = Cape Town; if results are thin, change to **South Africa**.

**Note:** Apollo may not have "Business Services" as an industry — use only the other industries listed for each search; keywords will narrow the results.

---

## Part 1: Company search (Apollo → Search → Companies)

For each search: set the filters below, run search, export companies, add column **segment** with the value in **Segment label**.

---

### Search 1 — Lead gen / appointment setting

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Marketing & Advertising |
| **Keywords** | appointment setting OR lead generation OR demand generation OR outbound agency |
| **Company size** | 10 to 200 employees |
| **Location** | Cape Town |
| **Segment label** | lead_gen_appointment_setting |

---

### Search 2 — Telemarketing / cold calling

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Marketing & Advertising |
| **Keywords** | telemarketing OR cold calling OR telesales OR outbound calling |
| **Company size** | 10 to 200 employees |
| **Location** | Cape Town |
| **Segment label** | telemarketing |

---

### Search 3 — Market research / fieldwork

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Market Research |
| **Keywords** | market research OR fieldwork OR phone surveys OR data collection |
| **Company size** | 10 to 200 employees |
| **Location** | Cape Town |
| **Segment label** | market_research |

---

### Search 4 — Recruitment / staffing

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Staffing & Recruiting, Human Resources Services |
| **Keywords** | recruitment agency OR staffing agency OR tech recruiting OR RPO |
| **Company size** | 10 to 200 employees |
| **Location** | Cape Town |
| **Segment label** | recruitment_staffing |

---

### Search 5 — BPO / call centre (outbound)

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | BPO, Customer Service |
| **Keywords** | BPO OR call centre OR contact centre outbound |
| **Company size** | 50 to 200 employees |
| **Location** | Cape Town |
| **Segment label** | bpo_outbound |

---

### Search 6 — Customer onboarding / welcome calls

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Customer Service, BPO |
| **Keywords** | customer onboarding OR welcome calls OR account setup OR new customer calls |
| **Company size** | 20 to 200 employees |
| **Location** | Cape Town |
| **Segment label** | customer_onboarding |

---

### Search 7 — Appointment reminders / booking

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Healthcare, Beauty & Wellness |
| **Keywords** | appointment reminders OR appointment booking OR appointment confirmation |
| **Company size** | 10 to 200 employees |
| **Location** | Cape Town |
| **Segment label** | appointment_reminders |

---

### Search 8 — Data verification / database cleanup

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Data Management, Marketing |
| **Keywords** | data verification OR database cleanup OR contact verification OR data enrichment |
| **Company size** | 10 to 100 employees |
| **Location** | Cape Town |
| **Segment label** | data_verification |

---

### Search 9 — Property / listing verification

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Real Estate |
| **Keywords** | property verification OR listing verification OR estate verification |
| **Company size** | 10 to 100 employees |
| **Location** | Cape Town |
| **Segment label** | property_verification |

---

### Search 10 — Lead qualification / SDR services

| Apollo field | Exact value |
|--------------|-------------|
| **Industry** | Sales, Marketing & Advertising |
| **Keywords** | lead qualification OR SDR services OR sales development OR lead scoring |
| **Company size** | 10 to 100 employees |
| **Location** | Cape Town |
| **Segment label** | lead_qualification |

---

## Part 2: People search (Apollo → Search → People)

Use this **after** you have company lists from Part 1. You’re getting decision-makers who own calling, ops, or sales.

| Apollo field | Exact value |
|--------------|-------------|
| **Company** | Upload/paste your exported company list (or filter by those domains). |
| **Location** | Cape Town (same as company search). |
| **Job titles** | Head of Recruitment, Recruitment Manager, Talent Acquisition, Managing Director, Founder, CEO, Sales Director, Head of Demand Gen, VP Sales, Operations Manager, Call Centre Manager, Contact Centre Manager |
| **Seniority** | Manager, Director, VP, C-Level, Owner, Founder |

**Export:** Name, Job title, Company, Email, LinkedIn URL.

---

## Quick reference — all segment labels

- lead_gen_appointment_setting  
- telemarketing  
- market_research  
- recruitment_staffing  
- bpo_outbound  
- customer_onboarding  
- appointment_reminders  
- data_verification  
- property_verification  
- lead_qualification  

Add the **segment** column to your export using the label from the search you ran.
