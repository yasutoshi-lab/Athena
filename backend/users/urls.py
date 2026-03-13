from django.urls import re_path

from . import views

urlpatterns = [
    re_path(r"^login/?$", views.LoginView.as_view(), name="token_obtain_pair"),
    re_path(r"^refresh/?$", views.RefreshView.as_view(), name="token_refresh"),
    re_path(r"^logout/?$", views.logout_view, name="logout"),
    re_path(r"^me/?$", views.me_view, name="me"),
]
