---
title: "Productive Engineering–Finance Partnership"
publishDate: "2018-10-27"
slug: engineering-finance-partnership
summary: >-
  A successful partnership between Engineering and Finance creates better
  business outcomes.
---
I led the cloud cost accounting team at Stripe. We worked to significantly
reduce AWS costs, primarily through automated
[reserved instance purchasing](https://stripe.com/blog/aws-reserved-instances).

One reason we were effective was our close partnership with the Finance team. We
were able to achieve better outcomes for Stripe because we were aligned. In this
post, I'll enumerate what we did to work well together.

### Shared Data

To start, we agreed on terms:

- We always measured AWS spend with the
  [public on-demand price](https://aws.amazon.com/about-aws/whats-new/2016/12/aws-cost-and-usage-report-now-contains-public-on-demand-pricing-and-more/)
  and layered in reserved instance and EDP discounts as separate line items.
- We only talked about instance usage in terms of xlarge-normalized units.
- We established the dimensions over which we could slice our cost data: team,
  host type, and a functional grouping we defined together.

Next, we made sure we could both access the same data:

- Our
  [cost and usage report](https://aws.amazon.com/aws-cost-management/aws-cost-and-usage-reporting/)
  was accessible by a Redshift webface to which we both had access. The frontend
  allowed persisting and sharing query results.
- AWS financial forecasts were shared via Google Drive, which allowed
  Engineering to have direct input to the forecasting process.
- Short-term usage forecasts for a collection of host types were snapshotted to
  a database and accessible via a webface, which allowed an Engineering-driven
  bottom up model to influence the financial forecast and allowed Finance to
  measure the accuracy of the usage forecasts.

### Project Management

We structured the partnership to have one directly responsible individual (DRI)
on each team. The DRIs would meet every two weeks to share top asks and discuss
upcoming projects.

We made many decisions in these DRI syncs:

- We increased our target EC2
  [reserved instance coverage](https://aws.amazon.com/about-aws/whats-new/2017/03/discover-savings-opportunities-by-using-the-new-reserved-instance-coverage-reports-in-aws-cost-explorer/)
  by 10%.
- We started to buy ElastiCache reserved instances.
- We created a model for estimating the infra cost of individual transactions on
  our platform.
- We stack-ranked a list of 20 cost-saving opportunities and developed a
  strategy for planning the work across Engineering.

### Rigor

The partnership surfaced more opportunities to improve the quality of our work
by exposing problems that only existed on one half of the partnership. We
created more robust tooling by addressing them.

- Engineering built an automated system for reconciling monthly AWS invoices in
  the accounting ledger with the cost and usage report.
- Finance made their financial forecasts more granular to more accurately
  capture reserved instance discount rates across instance families.
- We collaborated on an ETL that generated itemized actuals for comparing with
  the forecast.

### Takeaways

This cross-functional partnership was rewarding because we achieved a lot
together and improved the quality of each other's work. Communicating with each
other early and often was the most critical factor in our success: create a
shared understaning and then create shared goals.

<hr>

_Need help managing your AWS costs? Let's
[connect](https://hyperbo.la/contact/)_.
