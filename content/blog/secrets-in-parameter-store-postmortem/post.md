---
title: "Postmortem: 502s During Parameter Store Rollout"
publishDate: "2018-11-16"
slug: secrets-in-parameter-store-postmortem
summary: >-
  Terraform misconfiguration of SSM PrivateLink endpoint completely brings down
  hyperbo.la.
---

Attempting to deploy [0.149.2] brought down [hyperbo.la] and caused all requests
to return 502 status code. Root cause is a misconfigured PrivateLink endpoint
and an unsafe ASG cycler script.

[0.149.2]: https://github.com/hyperbola/hyperbola/tree/v0.149.2
[hyperbo.la]: https://hyperbo.la/

### Context

Since 2014, [hyperbo.la] secrets were distributed via [flat files] with each
deployment. `.env` files were necessary when [hyperbo.la] was a single Linode
VPS, but AWS has better tools for distributing secrets.

[GH-100] converted `settings.py` to fetch secrets from [SSM Parameter Store].

App backend instances run in private VPC subnets with no Internet egress. Packer
builds run in a single public VPC subnet with a public IP.

I recently refactored terraform config to use a launch template instead of a
launch configuration. Deploys are now managed by an untested [ASG cycler
script].

0.149.0 includes a new task runner which includes a new and untested deploy
task, `inv deploy`, and a rollback task, `inv deploy.rollback`.

[flat files]:
  https://github.com/hyperbola/hyperbola/commit/8f08b3d8fc07bbde7f0098ec52604cd2062c0715#diff-2378b82d75acb7d14d7df6a2389e8a02
[gh-100]: https://github.com/hyperbola/hyperbola/pull/100
[ssm parameter store]:
  https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-paramstore.html
[asg cycler script]:
  https://github.com/hyperbola/hyperbola/blob/v0.149.2/bin/cycle_asg

### Timeline

#### 0.149.1

- [2018-11-10 22:11] Build fails due to [malformed Ansible config].

[malformed ansible config]:
  https://github.com/hyperbola/hyperbola/commit/f69a09882b665e5b83f0e1d61b8b03ba304be76b

#### 0.149.2

- [2018-11-11 00:04] `inv deploy` kicks off Packer build.
- [00:15] `inv deploy` finishes cycling the ASG.
- [00:16] Manual smoke test of `https://hyperbo.la/` shows nginx 502 page.
- [00:17] Uptime Robot reports [hyperbo.la] hard down.
- [00:17] `inv deploy.rollback`.
- [00:19] `inv deploy.rollback` finishes cycling the ASG.
- [00:20] Manual smoke test of `https://hyperbo.la/` shows we are recovered.
- [00:23] Uptime Robot reports we are back up.
- [01:08] [reconfigure ssm endpoint security groups].
- [01:09] Attempt to deploy 0.149.2 again.
- [01:11] Manual smoke test of `https://hyperbo.la/` shows nginx 502 page.
- [01:13] `inv deploy.rollback`.
- [01:14] `inv deploy.rollback` finishes cycling the ASG.
- [01:15] Manual smoke test of `https://hyperbo.la/` shows we are recovered.
- [01:19] Enable [private DNS for SSM endpoint].
- [01:22] Attempt to deploy 0.149.2 again.
- [01:25] Manual smoke test of `https://hyperbo.la/` shows deploy succeeds.
- [01:26] `https://hyperbo.la/healthz` confirms 0.149.2 is deployed.

At this point the incident is mitigated but [hyperbo.la] is undeployable.

[reconfigure ssm endpoint security groups]:
  https://github.com/hyperbola/hyperbola/commit/8ad4fe11dd4b66d476262a101ed7ad9ae9c9cdd4
[private dns for ssm endpoint]:
  https://github.com/hyperbola/hyperbola/commit/e04efe78b5b1be082facb9d4a255453acb18e0ff

#### 0.149.3

- [08:59] Cut 0.149.3 to package terraform changes into a release and clean up.
- [09:07] `inv deploy` kicks off Packer build.
- [09:11] `inv deploy.ami` fails when running `manage.py collectstatic`.

At this point I spent time to deep dive into VPC terraform to properly
[configure the SSM PrivateLink endpoint].

[configure the ssm privatelink endpoint]:
  https://github.com/hyperbola/hyperbola/commit/1a6b56247094faaaa57b40fbc5507994a65f53c5

#### 0.149.4

- [18:48] `inv deploy` kicks off Packer build.
- [18:59] Packer build finishes successfully.
- [19:05] `inv deploy` finishes cycling the ASG.
- [19:06] Manual smoke test of `https://hyperbo.la/` shows deploy succeeds.

At this point, the incident is over and we are stable.

### Root Cause Analysis

#### Implemented SSM PrivateLink endpoint without reading documentation

For most AWS features, the terraform documentation is descriptive enough that
implementation is straightforward. PrivateLink was non-trivial to set up. Errors
I made:

- Did not allow egress from Packer builder to endpoint.
- Did not allow ingress to endpoint from Packer.
- Did not allow egress from app backend to endpoint.
- Did not allow ingress to endpoint from app backend.
- Did not enable private DNS for zero-configuration use with boto3.

#### ASG cycler did not validate instances are healthy in ALB

The ALB already hits `/healthz`. Automate checking that hosts come up cleanly to
not rely on manual smoke testing. Automatically detach unhealthy hosts from the
ALB and halt the rollout.

### Remediation Items

- [GH-103]: add ALB healthchecks to `cycle_asg` script.
- [GH-101 (Done)][gh-101]: create a management domain in VPC for shared
  infrastructure.
- [Done][remediation-done]: add a lab terraform environment for testing VPC
  changes.
- [GH-104]: export instance journald logs for gunicorn and nginx to CloudWatch.

[gh-103]: https://github.com/hyperbola/hyperbola/issues/103
[gh-101]: https://github.com/hyperbola/hyperbola/pull/101
[remediation-done]:
  https://github.com/hyperbola/hyperbola/commit/f8fe09f9bf30864ed5a814fdbb7116ca3d279bad
[gh-104]: https://github.com/hyperbola/hyperbola/issues/104
