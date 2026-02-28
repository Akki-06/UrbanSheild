from django.core.mail import send_mail
from django.conf import settings
from apps.authorities.models import Authority


def escalate_disaster(disaster):

    severity = disaster.severity
    disaster_type = disaster.disaster_type.lower()

    recipients = []

    # 🔴 HIGH SEVERITY → NDRF + SDRF
    if severity >= 8:
        recipients = Authority.objects.filter(
            authority_type__in=["ndrf", "sdrf"]
        )

    # 🟠 MID SEVERITY
    elif 5 <= severity <= 7:
        if disaster_type in ["fire", "wildfire", "heatwave"]:
            recipients = Authority.objects.filter(
                authority_type="fire"
            )
        elif disaster_type in ["flood", "earthquake", "landslide"]:
            recipients = Authority.objects.filter(
                authority_type="police"
            )

    # 🟡 LOW SEVERITY → No escalation
    else:
        return {"message": "No escalation required"}

    emails = [auth.email for auth in recipients]

    if not emails:
        return {"error": "No authorities found"}

    send_mail(
        subject=f"🚨 Disaster Alert: {disaster.disaster_type.upper()}",
        message=f"""
Emergency Alert from UrbanShield

Type: {disaster.disaster_type}
Severity: {disaster.severity}
Location: {disaster.latitude}, {disaster.longitude}
Status: {disaster.status}

Immediate action required.
        """,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=emails,
        fail_silently=False,
    )

    return {"message": "Escalation sent", "recipients": emails}