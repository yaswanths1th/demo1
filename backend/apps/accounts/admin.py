# ✅ apps/accounts/admin.py
from django.contrib import admin
from .models import User, Department, Role, UserError, UserInformation, UserValidation


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "department_name", "is_active")
    search_fields = ("department_name",)
    list_filter = ("is_active",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "role_name", "department", "is_active")
    search_fields = ("role_name",)
    list_filter = ("department", "is_active")


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "id", "username", "email", "phone",
        "department", "role", "is_active", "date_joined"
    )
    search_fields = ("username", "email", "phone")
    list_filter = ("department", "role", "is_active")


# ✅ Register message tables in admin
@admin.register(UserError)
class UserErrorAdmin(admin.ModelAdmin):
    list_display = ("error_code", "error_message")


@admin.register(UserInformation)
class UserInformationAdmin(admin.ModelAdmin):
    list_display = ("information_code", "information_text")


@admin.register(UserValidation)
class UserValidationAdmin(admin.ModelAdmin):
    list_display = ("validation_code", "validation_message")
