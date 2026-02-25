from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# Register your models here.
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['username', 'email', 'is_staff', 'is_active', 'is_subscribed']
    fieldsets = UserAdmin.fieldsets + (
        ("Subscription", {"fields": ("is_subscribed",)}),
    )


from django.urls import path
from django.http import FileResponse, HttpResponseForbidden
import os
from django.conf import settings

class DBAdminView(admin.AdminSite):
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('download-db/', self.admin_view(self.download_db), name="download-db"),
        ]
        return custom_urls + urls

    def download_db(self, request):
        filepath = os.path.join(settings.BASE_DIR, 'db.sqlite3')
        return FileResponse(open(filepath, 'rb'), as_attachment=True, filename='db.sqlite3')

# Register custom admin site
custom_admin_site = DBAdminView(name='custom_admin')