import logging

from django.core.mail import send_mail
from django.conf import settings
from apps.authorities.models import Authority

logger = logging.getLogger(__name__)


def escalate_disaster(disaster):
    """Route a disaster to the appropriate authorities and send email alerts.

    Severity tiers
    --------------
    - severity >= 8 : NDRF + SDRF
    - 5 <= severity <= 7 : Fire dept (fire/heatwave) or Police (flood/earthquake)
    - severity < 5  : No escalation

    An ``EscalationLog`` is created so that the model-level guard in
    ``Disaster.save()`` won't fire a second time for the same event.
    """

    from apps.disasters.models import EscalationLog  # avoid circular import

    severity = disaster.severity
    disaster_type = disaster.disaster_type.lower()

    recipients_qs = Authority.objects.none()

    if severity >= 8:
        recipients_qs = Authority.objects.filter(
            authority_type__in=["ndrf", "sdrf"]
        )
    elif 5 <= severity <= 7:
        if disaster_type in ["fire", "wildfire", "heatwave"]:
            recipients_qs = Authority.objects.filter(authority_type="fire")
        elif disaster_type in ["flood", "earthquake", "landslide", "cyclone"]:
            recipients_qs = Authority.objects.filter(authority_type="police")

    if not recipients_qs.exists():
        logger.info(
            "No escalation required for disaster %s (type=%s, severity=%s)",
            disaster.pk, disaster_type, severity,
        )
        return {"message": "No escalation required"}

    emails = [auth.email for auth in recipients_qs if auth.email]
    authority_names = [auth.name for auth in recipients_qs]

    if not emails:
        logger.warning("Escalation skipped — no email addresses on matched authorities.")
        return {"error": "No authority email addresses found"}

    email_sent = False
    try:
        send_mail(
            subject=f"\U0001f6a8 Disaster Alert: {disaster.disaster_type.upper()}",
            message=(
                f"Emergency Alert from UrbanShield\n\n"
                f"Type: {disaster.disaster_type}\n"
                f"Severity: {disaster.severity}\n"
                f"Location: {disaster.latitude}, {disaster.longitude}\n"
                f"Status: {disaster.status}\n\n"
                f"Immediate action required."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=emails,
            fail_silently=False,
        )
        email_sent = True
        logger.info(
            "Escalation email sent for disaster %s to: %s",
            disaster.pk, emails,
        )
    except Exception as exc:
        logger.error(
            "Failed to send escalation email for disaster %s: %s",
            disaster.pk, exc,
        )

    # Create one EscalationLog per authority notified so the model-level guard
    # in Disaster.save() sees that escalation already happened and skips.
    for authority in recipients_qs:
        EscalationLog.objects.get_or_create(
            disaster=disaster,
            authority_name=authority.name,
            defaults={"email_sent": email_sent},
        )

    return {
        "message": "Escalation sent" if email_sent else "Escalation attempted (email failed)",
        "recipients": emails,
        "authorities": authority_names,
    }
