from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView


urlpatterns = [
    path("dj-admin/", admin.site.urls),

    # 🧩 Auth & Account routes
    path("api/auth/", include("apps.accounts.urls")),

    # ✅ Only 1 refresh + verify route needed
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # 📍 Addresses
    path("api/addresses/", include("apps.addresses.urls")),

    # 🔐 Password Reset & Change
    path("api/password-reset/", include("apps.password_reset.urls")),
    path("api/change-password/", include("apps.change_password.urls")),

    # 👤 User profile & Admin user management
    path("api/viewprofile/", include("apps.viewprofile.urls")),

    
]
