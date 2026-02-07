from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from school.permissions import HasModuleAccess


class AssetsRefView(APIView):
    """
    Placeholder reference endpoint. Assets models will be added later.
    """
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_key = "ASSETS"

    def get(self, request):
        return Response([], status=status.HTTP_200_OK)
