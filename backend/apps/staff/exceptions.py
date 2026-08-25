from rest_framework.exceptions import APIException

from apps.staff.lockout import lockout_payload


class StaffAccountLocked(APIException):
    status_code = 423
    default_code = "account_locked"
    default_detail = "Account locked due to too many failed login attempts."

    def __init__(self, staff):
        super().__init__(lockout_payload(staff))
