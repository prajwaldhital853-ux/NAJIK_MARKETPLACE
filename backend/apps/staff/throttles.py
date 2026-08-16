from rest_framework.throttling import AnonRateThrottle


class StaffLoginRateThrottle(AnonRateThrottle):
    scope = "staff_login"
