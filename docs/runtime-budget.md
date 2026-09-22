# Runtime budget

| Path | Budget | How measured |
| --- | --- | --- |
| `GET /` TTFB (production `next start`) | ≤ 1500 ms on local box | Playwright / curl wall clock |
| Client JS for home (first load, no auth) | ≤ 900 KB transferred gzip-ish | Next build client chunk inventory |
| Auth modal open → interactive inputs | ≤ 300 ms after click | Playwright timing |

Budgets are regression fences for until-100 leanness, not SLOs.
