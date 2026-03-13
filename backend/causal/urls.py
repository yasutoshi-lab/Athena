from django.urls import re_path

from . import views

urlpatterns = [
    re_path(r"^sessions/?$", views.session_list, name="session_list"),
    re_path(r"^sessions/(?P<session_id>\d+)/?$", views.session_detail, name="session_detail"),
    re_path(
        r"^sessions/(?P<session_id>\d+)/graph/?$",
        views.session_graph,
        name="session_graph",
    ),
    re_path(r"^usage/?$", views.usage_view, name="usage"),
    re_path(r"^settings/?$", views.settings_view, name="settings"),
]
