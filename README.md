# hyperbola-static

[![GitHub Actions](https://github.com/lopopolo/hyperbola-static/workflows/CI/badge.svg)](https://github.com/lopopolo/hyperbola-static/actions)
[![hyperbola](https://img.shields.io/badge/site-hyperbo.la-28dcdc.svg)](https://hyperbo.la/)

Static site backend for <https://hyperbo.la>.

hyperbo.la is Ryan Lopopolo's personal website. Primary content consists of a
[blog], [contact page], and Twitter-like [lifestream].

`hyperbola-static` is a rewrite of [`hyperbola`], which was a Django-based
webapp, hosted on AWS and deployed with Packer and Ansible.

`hyperbola-static` is a set of static HTML pages generated with webpack, hosted
on GitHub pages and deployed with GitHub Actions.

[`hyperbola`]: https://github.com/lopopolo/hyperbola
[blog]: https://hyperbo.la/w/
[contact page]: https://hyperbo.la/contact/
[lifestream]: https://hyperbo.la/lifestream/
