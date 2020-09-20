# email is configured using Route53 for G Suite.

module "hyperbola_email_dns" {
  source = "./modules/gsuite/email-dns"

  zone_id   = aws_route53_zone.this.zone_id
  zone_name = aws_route53_zone.this.name

  google_site_verifcation_keys = [
    "Kt2HDssbfMv5OIL422wGGexn00n1W4nTAZZTfUkyig8",
    "vBbksaHJiPR9xr5eyVdQdvvIixg9di8BLwku3Sr1KCU",
  ]

  dkim = "p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAk+xt4FleDx6/2ZY0vsfQCFY7Zh9v6EeXRWdw8Vqw88Dg+h1gpdB85722M2gITZFMAdrpXkxRQ89YQgrVfEitaLbaI74UCbeIBn6f+y+UNnS0RSimmqJTFyvFJTsEBway2QGFeZiRpYvXZAYsEsTwEyNwKz/7uRQSTKrua6r0rsooqK7auNn+YRmcNJJ3uOcPZrUnx4punYaFDd/naa1Eo9nXKFemHHT6eLc620FWC+/MJWIlRFugsKPoiKu+0uAD0/EHE7x/5DwjrTutVLnuKlOA7tCHL0kir2f8wUOv0KRnC94G8hGl6nVML5iVk3So6SwFeovSkkM7tEUAL+4q6QIDAQAB"
}
