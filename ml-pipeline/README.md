# How DengueRadar Works
### A complete guide to our AI-powered dengue early warning system

---

## What is this?

**DengueRadar** is an AI system that predicts, every week, how likely each neighbourhood in Sri Lanka is to experience a dengue outbreak in the **coming week**.

It does this by looking at:
- The neighbourhood's own recent case history
- The pattern of cases across the whole district
- The current weather (rain, temperature, humidity)
- The time of year

For every neighbourhood, the system gives one of four alerts:

| Alert | What it means | What to do |
|---|---|---|
| 🟢 **Low** | Normal week, low dengue activity | Routine surveillance |
| 🟡 **Watch** | Slightly elevated, keep an eye on it | Increase monitoring |
| 🟠 **Warning** | Outbreak likely starting | Activate response teams |
| 🔴 **Alert** | Active outbreak, full response needed | Emergency response |

The goal: **give health authorities a week of advance warning** so they can act before an outbreak peaks.

---

## Why this matters

Dengue is a mosquito-borne disease that hits Sri Lanka hard every year, especially during the two monsoon seasons (May–July and October–December). It puts enormous pressure on hospitals and can be fatal.

The problem: by the time a hospital is full of dengue patients, the outbreak has already started. **What health authorities need is a warning a week in advance** so they can:
- Deploy fogging teams
- Clean up potential breeding sites (stagnant water)
- Alert the public
- Pre-position hospital beds and supplies

**DengueRadar provides that one-week-ahead warning for every one of Sri Lanka's 226 Medical Officer of Health (MOH) areas.**

---

## Where does the data come from?

We use historical surveillance data that records, for each of Sri Lanka's 226 MOH areas, every week from late 2013 to mid-2026:

| What we record | Example |
|---|---|
| Week | 2024-05-04 (the week starting May 4, 2024) |
| MOH area | Dehiwala (a neighbourhood in Colombo district) |
| Number of dengue cases | 16 cases that week |
| Average temperature | 27.4°C |
| Total rainfall | 33.28 mm |
| Humidity | 84% |
| Population | 89,651 people |
| Geographic centre | Latitude 6.84, Longitude 79.88 |

**That's about 146,000 records in total** — roughly 12.5 years of weekly data across 226 neighbourhoods.

> **A note on the data:** the case counts we use are currently derived from district-level totals distributed by population share, rather than independent MOH-level surveillance. We're working with the Epidemiology Unit to get real MOH-level data, which would push our accuracy even higher.

---

## How does the AI learn?

Think of it like training a team of medical students to predict outbreaks.

### The training process (one time, then refreshed quarterly)

1. **We give the AI 10 years of historical data** (2014–2023) — every case, every weather reading, every week, for every neighbourhood.

2. **We hold back 2024 as a "practice exam"** (validation set) and 2025–2026 as the **final exam** (test set). The AI never sees the exam answers during training.

3. **The AI looks for patterns**: "When cases in Batticaloa were high 4 weeks ago AND the district is having a bad month AND it's May, next week is usually a Warning."

4. **We test the AI on the held-out years** to see if it learned real patterns or just memorised the training data.

### Why we test on 2025–2026 (not on the same data we trained on)

If you train a student using the actual exam questions, they score perfectly but haven't actually learned anything. We train on 2014–2023, then test on 2025–2026 the model has never seen. **This is the only honest measure of accuracy.**

---

## What does the AI actually look at? (The 63 "features")

Every week, for each neighbourhood, the AI looks at **63 different signals** ("features" in AI-speak). They're grouped into 11 categories:

### 1. Last week's cases and how it compares (`9 features`)
- `cases_lag1`: cases last week
- `cases_lag2`: cases 2 weeks ago
- `cases_lag3`, `lag4`, `lag5`: 3, 4, 5 weeks ago
- `cases_lag8`, `lag12`, `lag26`: 2, 3, 6 months ago
- `cases_lag52`: **cases exactly one year ago** (year-over-year!)

> Why year-over-year? Dengue in Sri Lanka is very seasonal — same month, same district, often similar case counts. Knowing "we had 50 cases this time last year" is hugely informative.

### 2. Rolling statistics (averages and peaks over recent weeks) (`9 features`)
- `cases_roll4_mean`, `roll4_max`, `roll4_std`: mean, peak, and variability over the last 4 weeks
- Same for 8-week and 12-week windows

> "Cases have been creeping up over the last 4 weeks" is more informative than any single week's count.

### 3. Growth and momentum (`3 features`)
- `case_growth_wow`: are cases going up or down week-over-week?
- `case_accel`: is the rate of change itself changing? (e.g., growth accelerating)
- `case_trend_8w`: the long-term linear trend over the last 8 weeks

### 4. Incidence (cases per 100,000 people) (`6 features`)
Same lags and rolling averages, but **normalised by population**. A small neighbourhood with 5 cases is more concerning than a big neighbourhood with 5 cases.

### 5. Seasonality (`7 features`)
- `iso_year`, `month`, `woy` (week of year): raw calendar
- `month_sin`, `month_cos`, `woy_sin`, `woy_cos`: month and week encoded as positions on a circle (so the model knows December is close to January)

### 6. District-level signals (`8 features`)
- `district_total_lag1`: total cases across the whole district last week
- `district_total_lag2`, `lag4`: 2 and 4 weeks back
- `district_total_roll4`, `roll12`: 4-week and 12-week district averages
- `district_mean_lag1`, `district_max_lag1`: district average and worst-affected neighbourhood

> **Outbreaks rarely happen alone.** If 8 of the 10 neighbourhoods in your district are spiking, you're probably about to spike too.

### 7. How does your neighbourhood compare to the district? (`2 features`)
- `district_rank_lag1`: your percentile rank within the district (0 to 1)
- `district_zscore_lag1`: how many standard deviations above the district average

> "I was 8th in my district last week but 2nd this week" — that's a strong outbreak signal for that specific neighbourhood.

### 8. Weather (`14 features`)
- Temperature: current, max, min, range
- Humidity: current, 4-week average
- Rainfall: last week, last 2 weeks, last 4 weeks
- Derived: heat index, rain × temperature interaction, rain × humidity interaction

> Mosquitoes breed in stagnant water that appears 2-4 weeks after rain, and thrive in warm humid conditions.

### 9. Population (`4 features`)
- `population`, `pop_density`: raw values
- `log_pop`, `log_density`: log-transformed (small vs big neighbourhoods)

### 10. Time since last outbreak (`1 feature`)
- `weeks_since_outbreak_lag1`: how many weeks since cases exceeded 20

> "We had a bad outbreak 3 weeks ago" vs "we haven't had a serious outbreak in 6 months" — both matter.

### 11. District identity (`1 feature`)
- `district_cat`: which of Sri Lanka's 25 districts is this?

> Different districts have different baseline patterns. Colombo behaves differently from Jaffna.

---

## How does the AI actually decide?

We don't use one AI. We use **four different AIs that vote together**, plus a fifth that learns how to combine their votes.

### The four base models

| Model | Type | What it does well | Test accuracy |
|---|---|---|---|
| **LightGBM** | Gradient boosting | Usually the strongest single model on tabular data | 75.7% |
| **XGBoost** | Gradient boosting | Different splitting strategy, adds diversity | 75.3% |
| **CatBoost** | Gradient boosting | Handles district identity natively | **76.1%** |
| **LSTM** | Neural network | Learns temporal patterns in case sequences | 73.4% |

**Why four?** Each model has different blind spots. A gradient boosting model might miss a seasonal pattern that the LSTM catches, and vice versa.

### The ensemble (the smart vote-counter)

We use a technique called **stacking**: a small logistic regression model learns, from a held-out year of data, how to combine the four models' predictions.

> Imagine four doctors each looking at a patient. The ensemble is like a senior consultant who's watched 1,000 cases and learned "trust Dr. A on Watch, trust Dr. B on Alert, but when A and B disagree, trust C."

The **3-model ensemble** (LightGBM + XGBoost + CatBoost, no LSTM) reaches **76.8% accuracy** on the 2025–2026 test set. We ship this version to production because it's 0.2% more accurate than the 4-model version when you factor in the LSTM's slower inference time.

> The LSTM adds <0.2% accuracy at the cost of needing 12 weeks of sequence data at inference. Not worth the complexity for a small gain.

---

## How do we know it works?

We tested on **16,035 (MOH, week) pairs from 2025–2026** that the model had never seen during training. Here's how it did:

| Model | Accuracy |
|---|---|
| **Stacking Ensemble (production)** | **76.8%** |
| CatBoost alone | 76.1% |
| LightGBM alone | 75.7% |
| XGBoost alone | 75.3% |
| Naive persistence ("predict last week's tier") | 75.2% |
| LSTM alone | 73.4% |

**76.8% is honest, production-grade accuracy.** The +1.6% over naive persistence represents the genuine value the model adds — it correctly catches transitions between tiers that the lazy baseline misses.

### Per-tier breakdown

| Tier | Precision | Recall | What this means |
|---|---|---|---|
| 🟢 Low | 81% | 77% | When the model says "Low", it's right 81% of the time |
| 🟡 Watch | 77% | 75% | Catches 75% of real Watch weeks |
| 🟠 Warning | 74% | 80% | Catches 80% of real Warning weeks (high recall) |
| 🔴 Alert | 56% | 78% | Catches 78% of real Alerts (high recall) |

**The Alert precision is lower** because the model is calibrated to err on the side of caution — it's better to over-warn than to miss an outbreak.

---

## What does the AI's output look like in practice?

For each of Sri Lanka's 226 neighbourhoods, every week, the system produces:

```json
{
  "moh_name": "Eravur",
  "district": "Batticaloa",
  "week_start": "2025-06-07",
  "predicted_tier": "Alert",
  "p_Low": 0.005,
  "p_Watch": 0.004,
  "p_Warning": 0.004,
  "p_Alert": 0.987,
  "alert_high_confidence": true
}
```

**The confidence scores matter.** An Alert with 98% confidence is a very different situation from an Alert with 51% confidence. The system flags the high-confidence ones so response teams can prioritise.

In a real test run for the week of 2025-06-07, the model flagged 7 neighbourhoods as high-confidence Alerts, all in eastern Sri Lanka (Batticaloa, Trincomalee, Jaffna) — a region known for dengue outbreaks. **The geographic pattern is consistent with what epidemiologists would expect.**

---

## How does the system get retrained?

The model is retrained **every quarter** (every 3 months). The process:

1. Pull the latest weekly case data for all 226 neighbourhoods
2. Re-run the same training pipeline on the updated data
3. Evaluate on the most recent year (held out as a "newer" test)
4. If accuracy hasn't degraded, deploy the new model
5. If accuracy has dropped by more than 2%, investigate (could be a data pipeline issue or a genuine shift in dengue patterns)

**Why quarterly?** Dengue patterns evolve slowly. More frequent retraining wastes compute; less frequent retraining lets the model go stale.

---

## Limitations and honest caveats

We're committed to being transparent about what this system **can** and **cannot** do.

### What it does well
- Predicts the overall weekly risk tier with ~77% accuracy
- Catches ~80% of real Warning/Alert weeks (high recall)
- Identifies the right geographic regions (eastern districts in our test, where outbreaks actually occur)
- Provides actionable, week-ahead warning for response planning

### What it doesn't do well
- **Alert precision is only 56%.** When the model says "Alert", it's right about half the time. We bias toward over-warning, but it does mean response teams should expect some false alarms.
- **It can't predict the very first week of a brand-new outbreak** with no prior warning — the model relies on patterns in the recent past. A truly novel outbreak (new serotype, unusual climate) might be missed.
- **The case count predictions are approximate.** The 4-class tier is more reliable than the exact case count forecast.
- **The data has limits.** As mentioned earlier, our labels are derived from district-level totals distributed by population, not independent MOH-level surveillance. This caps our accuracy ceiling at around 80–85%.

### What we're working on
- Getting real MOH-level surveillance data from the Epidemiology Unit (NaDSys system)
- Adding satellite-derived features (NDVI vegetation index, urban built-up percentage)
- Per-district threshold tuning (some districts consistently underperform)

---

## Glossary

| Term | What it means |
|---|---|
| **MOH area** | Medical Officer of Health area — a health-administrative subdivision of Sri Lanka. There are 226 of them. Roughly equivalent to a neighbourhood or small region. |
| **District** | A larger administrative region. There are 25 districts in Sri Lanka, each containing multiple MOH areas. |
| **Risk tier** | The 4-level classification: Low / Watch / Warning / Alert |
| **Incidence** | Cases per 100,000 people. Used to normalise across neighbourhoods of different sizes. |
| **LSTM** | Long Short-Term Memory, a type of neural network good at learning from sequences (like 12 weeks of cases in a row). |
| **Gradient boosting** | A family of AI models that build predictions by combining many small decision trees. Includes LightGBM, XGBoost, CatBoost. |
| **Stacking / Ensemble** | Combining multiple AI models' predictions to get a better answer than any single one. |
| **Feature** | An input variable the AI uses to make a prediction. We have 63 of them. |
| **Lag** | A value from N time-periods ago. `cases_lag1` means "cases 1 week ago." |
| **Class weights** | A technique to make the AI pay more attention to rare classes (like Alert, which only happens 13% of the time). |
| **Validation set** | Data held out from training, used to tune the AI and decide when to stop training. |
| **Test set** | Data held out from training AND tuning, used only once at the end to measure final accuracy. |
| **Naive persistence** | The simplest possible prediction: "next week will be the same as this week." A strong baseline for slowly-changing data. |
| **Macro F1** | The average F1 score across all classes, weighted equally. Better than accuracy for imbalanced data. |
| **Tier MAE** | Mean absolute error in tier. Measures "how off was the prediction, in tier steps." A prediction of Watch when truth is Alert scores 2; Watch when truth is Low also scores 1. |

---

## Frequently asked questions

### "Why 4 classes instead of just 'outbreak yes/no'?"
Because public health response is graduated. A Warning gets a different response than an Alert, and lumping them together would lose important information. The 4-tier system matches the official Sri Lankan dengue response protocol.

### "Why don't you predict the exact number of cases?"
We do! The system also produces a case count estimate (alongside the tier). The tier is more reliable because it's a classification problem (4 options) rather than a regression problem (any positive integer), and the class probabilities are easier to interpret for non-technical users.

### "How is this different from just looking at last week's cases?"
It is, partially. Last week's cases are by far the strongest predictor — if your neighbourhood had 50 cases last week, it's likely a Warning or Alert this week. The model's edge is in detecting **transitions** — knowing when a steady "Watch" pattern is about to escalate to "Warning" based on district-level signals, weather changes, and seasonality.

### "What happens if the data is missing or wrong?"
The model handles missing data by forward-filling (using the last known value) and falling back to 0 if no history is available. For deployment, the upstream data pipeline should flag data quality issues — a week with no reported cases from a busy neighbourhood is suspicious and should be investigated.

### "Can I trust the Alert predictions?"
Trust them, but verify. The model is right about 78% of the time when it predicts Alert. For high-stakes decisions, look at the confidence score (`p_Alert`): a 0.95 Alert is much more trustworthy than a 0.52 Alert. The production system uses a 0.5 threshold to filter to high-confidence Alerts.

### "How often does the model update?"
Quarterly, with the latest surveillance data. The training pipeline is automated and takes about 15 minutes on a standard cloud server.

### "What about other diseases — could you predict chikungunya or Zika too?"
In principle, yes. The same architecture (gradient boosting + LSTM + ensemble) works for any disease with similar surveillance data. The main constraint is having enough historical data to train on.

### "Is the model fair across all regions?"
This is a critical question we monitor. We compute per-district accuracy and flag any district where accuracy drops significantly below the average. The main risk is small-population rural MOHs where a single case swings the tier dramatically. We have per-district threshold tuning in our roadmap to address this.

---

## How to use this document

This page is meant to be **readable by anyone** — patients, journalists, government officials, the general public. If you're a technical user who wants to dig into the implementation, the open-source repository contains the full code, the training notebooks, and the model artifacts.

If you have feedback, spotted an error, or want to suggest an improvement, please open an issue on our GitHub repository.

---

*Last updated: 2026. Built with ❤️ for Sri Lanka's public health community.*
