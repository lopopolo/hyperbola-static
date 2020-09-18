---
title: "AWS Is Your Org Chart"
publishDate: "2018-10-27"
slug: aws-org-chart
summary: >-
  Your AWS infrastructure is designed by your org chart. Alignment comes from
  increased communication and accountability.
---

The resources scattered throughout your AWS infrastructure form a map of your
org. They show how your organization plans and makes technical decisions. Let's
walk through some scenarios and see what they imply about your org structure.

### 99 AWS Problems

You have 57 RDS instances, each with a different combination of instance type,
EBS volume type, and database engine. Technical decision-making is
decentralized.

Your entire EC2 fleet is comprised of six instance _types_. Capacity planning is
centrally-managed, as is cloud orchestration.

Half of your Elasticsearch clusters are
[AWS-managed](https://aws.amazon.com/elasticsearch-service/); the other half run
on self-managed EC2 instances. There is misalignment between two (or more)
teams. Cost is not consistently considered when making architectural decisions,
which means that engineering is misaligned with finance.

You buy
[reserved instances for EC2](https://aws.amazon.com/ec2/pricing/reserved-instances/)
but not
[ElastiCache](https://aws.amazon.com/elasticache/pricing/#Heavy_Utilization_Reserved_Nodes).
Missing payment options and offering classes on ElastiCache RIs prevent you from
applying your EC2 RI purchasing rules. Your biggest ElastiCache spender does not
discuss this with finance, indicating a missing escalation path.

You keep submitting service limit increases for
[VPC peering limits](https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html#vpc-limits-peering).
Engineering teams think they are building isolated infrastructure, but changing
requirements break these assumptions. There is not enough global coordination
during medium-term planning cycles.

One of your workloads upgrades from `c3`s to `c5d`s
[the day they are released](https://aws.amazon.com/about-aws/whats-new/2018/05/introducing-amazon-ec2-c5d-instances/);
another similar workload does not. Teams operate in silos. Technology news
relevant to development propagates haphazardly.

You purchase hundreds of reserved instances every month. You have a team
dedicated to
[globally-optimizing AWS costs](https://stripe.com/blog/aws-reserved-instances).

### Conway's Law

Fixing the misalignments in these case studies requires increased communication.

Within engineering, 1:1s across team boundaries can be an effective way of
socializing information. Working groups for teams that have similar workloads or
infrastructure needs can align folks on consistent techniques.

The
[misalignments between engineering and finance](https://hyperbo.la/w/engineering-finance-partnership/)
in the case studies span department boundaries. To correct these, designate a
single point of contact (person or team) from each department. The points are
responsible for communicating each other's requirements across the department
boundary. Having a single directly responsible individual (DRI) within a
department makes it easy to determine accountability.

### Many Problems, Many DRIs

Core to the dysfunction in the above case studies is the tension between
centralized and decentralized decision-making. I think the correct way to strike
a balance is to identify the areas you care about and assign a single DRI for
each. This allows you to centralize individual projects as well as avoid single
points of failure.

If you want to change your story around Elasticsearch, cost optimization, and
cross-team planning, assign a single person responsibility and imbue them with
the authority to make changes. It helps if these DRIs align with team
responsibilities so they may enlist additional resources if required.

We use this model at [Stripe](https://stripe.com/jobs). The Search
Infrastructure team is consolidating our Elasticsearch infrastructure, the
Insight team drives our cost optimization strategy and reserved instance
purchasing, and the TPM org drives org-wide planning. Each team has consistently
improved how we execute on the area for which they are responsible because they
are empowered to do so.
