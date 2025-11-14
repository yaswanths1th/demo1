from django.db import models
from django.contrib.auth.models import AbstractUser


# ===========================
# ✅ Department Model
# ===========================
class Department(models.Model):
    department_name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.department_name


# ===========================
# ✅ Role Model
# ===========================
class Role(models.Model):
    role_name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("role_name", "department")

    def __str__(self):
        return self.role_name


# ===========================
# ✅ Custom User Model
# ===========================
class User(AbstractUser):
    """
    Custom User Model so we can extend fields.
    """
    username = models.CharField(
        max_length=150,
        unique=True,
        help_text="Required. 150 chars or fewer.",
    )

    email = models.EmailField(max_length=254, blank=True)

    phone = models.CharField(max_length=15, blank=True, null=True)
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL)
    role = models.ForeignKey(Role, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.username


# ===========================
# ✅ User Error Messages
# Maps to existing DB table: user_error
# ===========================
class UserError(models.Model):
    error_code = models.CharField(max_length=10, unique=True)
    error_message = models.CharField(max_length=255)

    class Meta:
        db_table = "user_error"  # ✅ important fix

    def __str__(self):
        return f"{self.error_code} - {self.error_message}"


# ===========================
# ✅ User Information Messages
# Maps to existing DB table: user_information
# ===========================
class UserInformation(models.Model):
    information_code = models.CharField(max_length=10, unique=True)
    information_text = models.CharField(max_length=255)

    class Meta:
        db_table = "user_information"  # ✅ important fix

    def __str__(self):
        return f"{self.information_code} - {self.information_text}"


# ===========================
# ✅ User Validation Messages
# Maps to existing DB table: user_validation
# ===========================
class UserValidation(models.Model):
    validation_code = models.CharField(max_length=10, unique=True)
    validation_message = models.CharField(max_length=255)

    class Meta:
        db_table = "user_validation"  # ✅ important fix

    def __str__(self):
        return f"{self.validation_code} - {self.validation_message}"
