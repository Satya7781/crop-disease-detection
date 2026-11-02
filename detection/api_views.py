from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.core.files.storage import default_storage
from .models import LeafImage
from .serializers import LeafImageSerializer
from .ml_models.predict import predict_disease
from PIL import Image
import logging

# Upload & List leaf images
class LeafImageListCreateView(generics.ListCreateAPIView):
    serializer_class = LeafImageSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LeafImage.objects.filter(user=self.request.user).order_by('-date_uploaded')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Predict disease from an uploaded image
class PredictDiseaseView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            leaf_image = LeafImage.objects.create(
                user=request.user,
                image=image_file,
            )

            # Open the image from storage
            with default_storage.open(leaf_image.image.name, 'rb') as f:
                img = Image.open(f).convert("RGB")

            # Run prediction
            prediction, confidence = predict_disease(img)
            leaf_image.predicted_label = prediction
            leaf_image.confidence_score = confidence
            leaf_image.save(update_fields=['predicted_label', 'confidence_score'])

            return Response({
                "prediction": prediction,
                "confidence": confidence,
                "image_url": leaf_image.image.url,
                "id": leaf_image.id,
            })
        except Exception as e:
            logging.exception("Error during disease prediction")
            return Response({"error": "An internal error has occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Retrieve, update, delete individual image by ID
class LeafImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LeafImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LeafImage.objects.filter(user=self.request.user)
