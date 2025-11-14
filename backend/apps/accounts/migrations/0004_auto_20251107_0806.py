from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='role',
            field=models.CharField(
                max_length=10,
                choices=[('admin', 'Admin'), ('user', 'User')],
                default='user'
            ),
        ),
    ]
