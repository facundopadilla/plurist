from django.contrib import admin

from .models import Invite, Membership, User, Workspace

admin.site.register(User)
admin.site.register(Workspace)
admin.site.register(Membership)
admin.site.register(Invite)
