from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.news.views import NewsViewSet
from apps.shelters.views import ShelterViewSet
from apps.disasters.views import DisasterViewSet
from apps.authorities.views import AuthorityViewSet
from apps.traffic.views import TrafficIncidentViewSet
from apps.core.views import (
    RouteViewSet, UserLocationViewSet, UserAlertPreferenceViewSet, 
    DisasterAlertViewSet, EvacuationZoneViewSet
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()

router.register(r'shelters', ShelterViewSet)
router.register(r'disasters', DisasterViewSet, basename='disaster')
router.register(r'authorities', AuthorityViewSet)
router.register(r'traffic', TrafficIncidentViewSet, basename='traffic')
router.register(r'route', RouteViewSet, basename='route')
router.register(r'user-location', UserLocationViewSet, basename='user-location')
router.register(r'alert-preference', UserAlertPreferenceViewSet, basename='alert-preference')
router.register(r'disaster-alert', DisasterAlertViewSet, basename='disaster-alert')
router.register(r'evacuation-zone', EvacuationZoneViewSet, basename='evacuation-zone')
router.register(r'news', NewsViewSet, basename='news')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]