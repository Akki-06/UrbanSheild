from django.contrib import admin
from .models import Disaster, EscalationLog
# Register your models here.
admin.site.register(Disaster)
admin.site.register(EscalationLog)
