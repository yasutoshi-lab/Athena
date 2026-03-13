from django.urls import path

from . import views

urlpatterns = [
    path("sessions/", views.session_list, name="session_list"),
    path("sessions/<int:session_id>/", views.session_detail, name="session_detail"),
    path(
        "sessions/<int:session_id>/graph/",
        views.session_graph,
        name="session_graph",
    ),
    path("usage/", views.usage_view, name="usage"),
    path("settings/", views.settings_view, name="settings"),
]
