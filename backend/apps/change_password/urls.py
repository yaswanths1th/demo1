from django.urls import path
from .views import change_password

urlpatterns = [
    path("change-password/", change_password, name="change-password"),
]
