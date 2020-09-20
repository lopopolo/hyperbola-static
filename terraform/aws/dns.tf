# DNS is managed by Route53 (not the registrar for hyperbo.la).

resource "aws_route53_zone" "this" {
  name = "hyperbo.la"
}

# hyperbo.la is hosted at the apex domain. GitHub Pages supports hosting at the
# apex domain and automatically sets up redirects from the `www` domain.
#
# https://docs.github.com/en/github/working-with-github-pages/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain

resource "aws_route53_record" "apex_ipv4" {
  zone_id = aws_route53_zone.this.zone_id
  name    = "hyperbo.la"
  type    = "A"
  ttl     = "300"

  records = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153",
  ]
}

resource "aws_route53_record" "apex_ipv6" {
  zone_id = aws_route53_zone.this.zone_id
  name    = "hyperbo.la"
  type    = "A"
  ttl     = "300"

  records = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153",
  ]
}

resource "aws_route53_record" "www_ipv4" {
  zone_id = aws_route53_zone.this.zone_id
  name    = "www"
  type    = "A"
  ttl     = "300"

  records = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153",
  ]
}

resource "aws_route53_record" "www_ipv6" {
  zone_id = aws_route53_zone.this.zone_id
  name    = "www"
  type    = "A"
  ttl     = "300"

  records = [
    "185.199.108.153",
    "185.199.109.153",
    "185.199.110.153",
    "185.199.111.153",
  ]
}
output "hyperbola_zone_id" {
  value = aws_route53_zone.this.zone_id
}
