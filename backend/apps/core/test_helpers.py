from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle

OPEN_RATES = {
    "anon": "10000/sec",
    "login": "10000/sec",
    "register": "10000/sec",
    "staff_login": "10000/sec",
    "otp": "10000/sec",
    "seller_apply": "10000/sec",
    "password_reset": "10000/sec",
    "google": "10000/sec",
}


def disable_api_throttles():
    rates = getattr(SimpleRateThrottle, "THROTTLE_RATES", None) or {}
    rates.update(OPEN_RATES)
    SimpleRateThrottle.THROTTLE_RATES = rates
    cache.clear()
