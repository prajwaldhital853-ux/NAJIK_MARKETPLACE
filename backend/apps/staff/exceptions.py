from rest_framework.exceptions import APIException

from apps.staff.lockout import lockout_payload


class StaffAccountLocked(APIException):
    status_code = 423
    default_code = "account_locked"
    default_detail = "Too many failed login attempts on this device."

    def __init__(self, lockout_row):
        super().__init__(lockout_payload(lockout_row))
