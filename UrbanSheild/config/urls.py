from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.shelters.views import ShelterViewSet
from apps.disasters.views import DisasterViewSet
from apps.authorities.views import AuthorityViewSet
from apps.traffic.views import TrafficIncidentViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()

router.register(r'shelters', ShelterViewSet)
router.register(r'disasters', DisasterViewSet)
router.register(r'authorities', AuthorityViewSet)
router.register(r'traffic', TrafficIncidentViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]