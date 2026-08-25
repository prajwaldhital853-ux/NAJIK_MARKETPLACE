"""Legal acceptance helpers for app user registration."""
from django.utils import timezone
from rest_framework import serializers

LEGAL_REQUIRED_MSG = "You must accept the Terms & Conditions and Privacy Policy to continue."


def legal_accepted_from(data) -> bool:
    if not data:
        return False
    return bool(data.get("legal_accepted"))


def require_legal_acceptance(data):
    if not legal_accepted_from(data):
        raise serializers.ValidationError({"legal_accepted": LEGAL_REQUIRED_MSG})


def stamp_legal_acceptance(user, data=None, *, require: bool = False) -> None:
    if require:
        require_legal_acceptance(data or {})
    elif data is not None and not legal_accepted_from(data):
        return

    now = timezone.now()
    updates = []
    if not user.terms_accepted_at:
        user.terms_accepted_at = now
        updates.append("terms_accepted_at")
    if not user.privacy_accepted_at:
        user.privacy_accepted_at = now
        updates.append("privacy_accepted_at")
    if updates:
        user.save(update_fields=updates)
