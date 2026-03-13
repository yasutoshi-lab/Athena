from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="token_obtain_pair"),
    path("refresh/", views.RefreshView.as_view(), name="token_refresh"),
    path("logout/", views.logout_view, name="logout"),
    path("me/", views.me_view, name="me"),
]
