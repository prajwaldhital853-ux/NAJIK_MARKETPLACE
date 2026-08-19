from django.contrib import admin

from apps.chat.models import ChatBlock, ChatMessage, ChatReport, ChatThread


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ("id", "listing_title", "buyer", "seller", "updated_at")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "thread", "kind", "sender", "created_at")


@admin.register(ChatBlock)
class ChatBlockAdmin(admin.ModelAdmin):
    list_display = ("blocker", "blocked", "created_at")


@admin.register(ChatReport)
class ChatReportAdmin(admin.ModelAdmin):
    list_display = ("id", "reporter", "accused", "status", "created_at")
