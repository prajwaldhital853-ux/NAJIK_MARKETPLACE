"""One-shot import of a media zip into MEDIA_ROOT (for Render bootstrap)."""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.staff.authentication import StaffJWTAuthentication
from apps.staff.permissions import IsStaffUser


class StaffMediaImportView(APIView):
    authentication_classes = [StaffJWTAuthentication]
    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not getattr(request.user, "is_super_admin", False):
            return Response({"detail": "Super admin only."}, status=status.HTTP_403_FORBIDDEN)

        upload = request.FILES.get("archive") or request.FILES.get("file")
        if not upload:
            return Response({"detail": "Upload a zip as 'archive'."}, status=status.HTTP_400_BAD_REQUEST)

        media_root = Path(settings.MEDIA_ROOT).resolve()
        media_root.mkdir(parents=True, exist_ok=True)

        written = 0
        skipped = 0
        try:
            raw = upload.read()
            with zipfile.ZipFile(io.BytesIO(raw)) as zf:
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    name = info.filename.replace("\\", "/")
                    # Strip a top-level "media/" prefix if present.
                    if name.startswith("media/"):
                        name = name[len("media/") :]
                    if not name or name.startswith("__MACOSX") or "/." in f"/{name}":
                        skipped += 1
                        continue
                    dest = (media_root / name).resolve()
                    if not str(dest).startswith(str(media_root)):
                        skipped += 1
                        continue
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info) as src, dest.open("wb") as out:
                        out.write(src.read())
                    written += 1
        except zipfile.BadZipFile:
            return Response({"detail": "Invalid zip file."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "detail": "Media imported into Django MEDIA_ROOT.",
                "media_root": str(media_root),
                "written": written,
                "skipped": skipped,
            }
        )
