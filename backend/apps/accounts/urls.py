from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import (
    register_user,
    ProfileAPIView,
    CustomTokenObtainPairView,
    AdminUserListCreateAPIView,
    AdminUserUpdateDeleteAPIView,
    AdminUserStatsAPIView,
    user_toggle_active,
    DepartmentListCreateAPIView,
    DepartmentRetrieveUpdateDestroyAPIView,
    department_toggle_active,
    RoleListCreateAPIView,
    RoleRetrieveUpdateDestroyAPIView,
    role_toggle_active,
    send_user_credentials,
    get_messages,  # ← canonical merged messages endpoint
)

# Optional: keep a constants endpoint if you want it for debugging
from .views_constants import ConstantsAPIView, SingleMessageAPIView

urlpatterns = [
    # Auth
    path("login/", CustomTokenObtainPairView.as_view()),
    path("register/", register_user),
    path("token/refresh/", TokenRefreshView.as_view()),

    # Profile
    path("profile/", ProfileAPIView.as_view()),

    # Users
    path("admin/users/", AdminUserListCreateAPIView.as_view()),
    path("admin/users/<int:pk>/", AdminUserUpdateDeleteAPIView.as_view()),
    path("admin/users/<int:pk>/toggle/", user_toggle_active),
    path("admin/stats/", AdminUserStatsAPIView.as_view()),

    # Departments
    path("departments/", DepartmentListCreateAPIView.as_view()),
    path("departments/<int:pk>/", DepartmentRetrieveUpdateDestroyAPIView.as_view()),
    path("departments/<int:pk>/toggle/", department_toggle_active),

    # Roles
    path("roles/", RoleListCreateAPIView.as_view()),
    path("roles/<int:pk>/", RoleRetrieveUpdateDestroyAPIView.as_view()),
    path("roles/<int:pk>/toggle/", role_toggle_active),

    # Messages (ONE canonical endpoint)
    path("messages/", get_messages, name="messages"),

    # (Optional) constants + single fetch endpoints for debugging/tools
    path("constants/", ConstantsAPIView.as_view(), name="constants"),
    path("messages/<str:type>/<str:code>/", SingleMessageAPIView.as_view(), name="messages-one"),

    # Email
    path("send-user-credentials/", send_user_credentials),
    path("check-username/", views.check_username, name="check_username"),
    path("check-email/", views.check_email, name="check_email"),
    
    
    
]
