---
title: "Social Coding 2018 Recap"
publishDate: "2018-12-28"
slug: social-coding-2018
summary: >-
  I contributed to open source more than I ever have in 2018; but there is a
  lot I can do to improve.
---

I keep track of every open source contribution I have ever made with the
[#patch](https://hyperbo.la/lifestream/hashtag/patch/) hashtag on my
[lifestream](https://hyperbo.la/lifestream/). 2018 wasn't a big year, but it was
my best so far. These are the contributions I made.

### Contributions

#### Fix Resource Leak in Gunicorn

[Gunicorn](https://gunicorn.org/) is a Python WSGI server. Gunicorn can be
configured using a Python module that is loaded with
[`exec`](https://docs.python.org/3/library/functions.html#exec). Gunicorn was
not closing the file handle after opening the provided module, which resulted in
a `ResourceWarning: unclosed file` warning.
[GH-1889](https://github.com/benoitc/gunicorn/pull/1889) addresses the leak by
opening and reading the module using a `with` block.

#### Fix Ansible Deprecation Warnings in lets-encrypt-route-53 Role

[`ansible-role-lets-encrypt-route-53`](https://github.com/mprahl/ansible-role-lets-encrypt-route-53)
is an [Ansible](https://www.ansible.com/) role that uses Amazon Route53 for the
`dns-01` challenge with the `acme_certificate` module. Ansible 2.7 deprecated
using `with_items` to specify packages with package modules, e.g. `apt`.
[GH-14](https://github.com/mprahl/ansible-role-lets-encrypt-route-53/pull/14)
updates the tasks to supply the list of packages directly to the module.

#### Reduce Scope of Tokio Dependencies in futures-locks

[`futures-locks`](https://github.com/asomers/futures-locks) is a Rust crate that
provides [Futures](https://docs.rs/futures/0.1.25/futures/)-aware locking
primitives. `futures-locks` depended on Tokio, which is a _fat_ dependency.
`tokio` is intended to be an _application crate_ dependency; a _library crate_
should
[depend on tokio sub crates](https://github.com/tokio-rs/tokio#project-layout).
[GH-10](https://github.com/asomers/futures-locks/pull/10) reduces the number of
crates that `futures-locks` depends on from 51 to 3.

### Successes in 2018

All of my PRs in 2018 are _linting_ and _warning_ shaped. By using these
libraries, I experienced some of their unfinished edges first-hand. This helped
narrow the scope of my first contributions to the projects. Narrowed scope
breeds two benefits: the changes are _good first issues_ and the changes are
easier to merge.

### Social Coding in 2019

Making an open source contribution has similar motivations to creating a
startup: solve a problem you have in an environment you know. Sending a PR
requires familiarity with the project; it requires you to have used the code. To
send more PRs in 2019, I need to _use more libraries_, which means broadening
scope and taking on projects in new domains.
